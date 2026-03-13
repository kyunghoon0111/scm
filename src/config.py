"""Load and validate configuration from DB (ops schema) first, YAML fallback.

Priority: DB (ops.*_config tables) > YAML files.
If DB is unavailable or empty, falls back to YAML.
"""
import json
import logging
import os
import urllib.request
import yaml
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

CONFIG_DIR = Path("config")

SUPPORTED_ALLOCATION_BASES = frozenset({
    "qty", "weight", "volume_cbm", "value", "revenue",
    "order_count", "line_count", "onhand_cbm_days", "onhand_qty_days",
})


@dataclass(frozen=True)
class ColumnDef:
    name: str
    type: str


@dataclass(frozen=True)
class TableSchema:
    description: str
    business_key: tuple
    event_date_column: str
    required_columns: tuple
    optional_columns: tuple


@dataclass(frozen=True)
class ChargeTypePolicy:
    charge_domain: str
    cost_stage: str
    capitalizable_flag: bool
    default_allocation_basis: str
    severity_if_missing: str


def _db_query(table: str, select: str = "*") -> list[dict] | None:
    """Query a Supabase ops-schema table via REST API. Returns None on failure."""
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not supabase_url or not supabase_key:
        return None
    try:
        url = f"{supabase_url}/rest/v1/{table}?select={select}"
        req = urllib.request.Request(url, headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        })
        with urllib.request.urlopen(req, timeout=5) as resp:
            rows = json.loads(resp.read())
        if rows:
            logger.info("Loaded %d rows from DB table %s", len(rows), table)
            return rows
    except Exception as e:
        logger.debug("DB config load failed for %s: %s", table, e)
    return None


class AppConfig:
    """Config holder: DB-first, YAML-fallback. Validated on construction."""

    def __init__(self, config_dir: Path | None = None):
        config_dir = config_dir or CONFIG_DIR
        # Schema and aliases always from yaml (no DB equivalent for table schemas)
        self.schema: dict[str, TableSchema] = self._load_schema(config_dir / "schema.yaml")
        self.aliases: dict[str, dict[str, list[str]]] = self._load_aliases(config_dir / "column_aliases.yaml")

        # DB-first, yaml-fallback for configurable settings
        self.charge_policy: dict[str, ChargeTypePolicy] = (
            self._load_charge_policy_from_db()
            or self._load_charge_policy(config_dir / "policies" / "charge_policy.yaml")
        )
        self.thresholds: dict = (
            self._load_thresholds_from_db()
            or self._load_yaml(config_dir / "thresholds.yaml")
        )
        self.coverage_policy: dict = (
            self._load_coverage_policy_from_db()
            or self._load_yaml(config_dir / "policies" / "coverage_policy.yaml")
        )

        # These stay yaml-only (no web UI yet)
        self.allocation: dict = self._load_yaml(config_dir / "policies" / "allocation.yaml")
        self.tax_policy: dict = self._load_yaml(config_dir / "policies" / "tax_policy.yaml")
        self._cross_validate()

    @staticmethod
    def _load_yaml(path: Path) -> dict:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _load_schema(self, path: Path) -> dict[str, TableSchema]:
        raw = self._load_yaml(path)
        result = {}
        for table_name, tdef in raw.get("tables", {}).items():
            result[table_name] = TableSchema(
                description=tdef.get("description", ""),
                business_key=tuple(tdef.get("business_key", [])),
                event_date_column=tdef.get("event_date_column", ""),
                required_columns=tuple(
                    ColumnDef(name=c["name"], type=c["type"])
                    for c in tdef.get("required_columns", [])
                ),
                optional_columns=tuple(
                    ColumnDef(name=c["name"], type=c["type"])
                    for c in tdef.get("optional_columns", [])
                ),
            )
        return result

    def _load_aliases(self, path: Path) -> dict[str, dict[str, list[str]]]:
        raw = self._load_yaml(path)
        return raw.get("aliases", {})

    def _load_charge_policy(self, path: Path) -> dict[str, ChargeTypePolicy]:
        raw = self._load_yaml(path)
        result = {}
        for ct_name, ct_def in raw.get("charge_types", {}).items():
            result[ct_name] = ChargeTypePolicy(
                charge_domain=ct_def["charge_domain"],
                cost_stage=ct_def["cost_stage"],
                capitalizable_flag=ct_def["capitalizable_flag"],
                default_allocation_basis=ct_def["default_allocation_basis"],
                severity_if_missing=ct_def["severity_if_missing"],
            )
        return result

    # ── DB loaders (return None if unavailable → triggers yaml fallback) ──

    @staticmethod
    def _load_charge_policy_from_db() -> dict[str, ChargeTypePolicy] | None:
        rows = _db_query("charge_type_config")
        if not rows:
            return None
        result = {}
        for r in rows:
            result[r["charge_type"]] = ChargeTypePolicy(
                charge_domain=r["charge_domain"],
                cost_stage=r["cost_stage"],
                capitalizable_flag=bool(r.get("capitalizable_flag", False)),
                default_allocation_basis=r["default_allocation_basis"],
                severity_if_missing=r.get("severity_if_missing", "warn"),
            )
        return result

    @staticmethod
    def _load_thresholds_from_db() -> dict | None:
        rows = _db_query("threshold_config")
        if not rows:
            return None
        # Reconstruct nested dict matching yaml structure:
        # { category: { key: value } }
        result: dict[str, dict[str, Any]] = {}
        for r in rows:
            cat = r["category"]
            key = r["key"]
            result.setdefault(cat, {})[key] = r["value"]
        return result

    @staticmethod
    def _load_coverage_policy_from_db() -> dict | None:
        rows = _db_query("coverage_policy_config")
        if not rows:
            return None
        # Reconstruct to match yaml structure expected by is_domain_required():
        # { domains: { domain: { requirement: ... } },
        #   close_period_enforcement: { domain: ... } }
        domains: dict[str, dict[str, str]] = {}
        close_enforce: dict[str, str] = {}
        for r in rows:
            domains[r["domain"]] = {"requirement": r["requirement"]}
            close_enforce[r["domain"]] = r.get("close_period_enforcement", "OPTIONAL")
        return {"domains": domains, "close_period_enforcement": close_enforce}

    def _cross_validate(self):
        """Cross-validate all configs for consistency."""
        # Validate charge policy allocation bases
        for ct_name, ct_policy in self.charge_policy.items():
            if ct_policy.default_allocation_basis not in SUPPORTED_ALLOCATION_BASES:
                raise ValueError(
                    f"Charge type '{ct_name}' has unsupported allocation basis: "
                    f"'{ct_policy.default_allocation_basis}'. "
                    f"Supported: {sorted(SUPPORTED_ALLOCATION_BASES)}"
                )

        # Validate allocation config overrides
        alloc_overrides = self.allocation.get("charge_type_overrides", {})
        for ct_name, override in alloc_overrides.items():
            if ct_name not in self.charge_policy:
                raise ValueError(
                    f"Allocation override references unknown charge type: '{ct_name}'"
                )
            for basis in override.get("basis_priority", []):
                if basis not in SUPPORTED_ALLOCATION_BASES:
                    raise ValueError(
                        f"Allocation override for '{ct_name}' has unsupported basis: '{basis}'"
                    )

        # Validate default_basis_by_stage
        for stage, bases in self.allocation.get("default_basis_by_stage", {}).items():
            for basis in bases:
                if basis not in SUPPORTED_ALLOCATION_BASES:
                    raise ValueError(
                        f"default_basis_by_stage[{stage}] has unsupported basis: '{basis}'"
                    )

        # Validate coverage domains reference valid charge domains
        known_domains = {ct.charge_domain for ct in self.charge_policy.values()}
        known_domains.update({"fx_rate", "revenue_settlement", "cost_structure"})

    def get_schema(self, table_name: str) -> TableSchema:
        """Get schema definition for a table."""
        if table_name not in self.schema:
            raise KeyError(f"Unknown table: '{table_name}'")
        return self.schema[table_name]

    def get_charge_type(self, charge_type: str) -> ChargeTypePolicy:
        """Get charge type policy."""
        if charge_type not in self.charge_policy:
            raise KeyError(f"Unknown charge type: '{charge_type}'")
        return self.charge_policy[charge_type]

    def get_threshold(self, *keys: str) -> Any:
        """Navigate thresholds dict by keys. E.g. get_threshold('inventory', 'doh_overstock', 'FG')"""
        val = self.thresholds
        for k in keys:
            if isinstance(val, dict):
                val = val[k]
            else:
                raise KeyError(f"Cannot navigate further at key '{k}'")
        return val

    def get_valid_charge_types(self) -> set[str]:
        """Return all known charge type names."""
        return set(self.charge_policy.keys())

    def get_charge_types_by_domain(self) -> dict[str, list[str]]:
        """Return charge types grouped by charge_domain."""
        result: dict[str, list[str]] = {}
        for ct_name, ct_policy in self.charge_policy.items():
            result.setdefault(ct_policy.charge_domain, []).append(ct_name)
        return result

    def get_allocation_basis_priority(self, charge_type: str) -> list[str]:
        """Get allocation basis priority for a charge type."""
        # Check overrides first
        overrides = self.allocation.get("charge_type_overrides", {})
        if charge_type in overrides:
            return overrides[charge_type].get("basis_priority", [])
        # Fall back to default by cost_stage
        ct_policy = self.get_charge_type(charge_type)
        stage = ct_policy.cost_stage
        defaults = self.allocation.get("default_basis_by_stage", {})
        if stage in defaults:
            return defaults[stage]
        return [ct_policy.default_allocation_basis]

    def get_sort_keys(self) -> list[str]:
        """Get determinism sort keys for allocation."""
        return self.allocation.get("determinism", {}).get(
            "sort_keys",
            ["period", "charge_type", "warehouse_id", "channel_store_id", "item_id", "lot_id", "business_key"]
        )

    def is_domain_required(self, domain: str, is_closed: bool = False) -> bool:
        """Check if a coverage domain is REQUIRED."""
        domains = self.coverage_policy.get("domains", {})
        close_enforce = self.coverage_policy.get("close_period_enforcement", {})

        if is_closed and domain in close_enforce:
            return close_enforce[domain] == "REQUIRED"

        dom_cfg = domains.get(domain, {})
        return dom_cfg.get("requirement", "OPTIONAL") == "REQUIRED"
