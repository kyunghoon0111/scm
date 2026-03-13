import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8">
          <p className="mb-2 font-medium text-red-800">이 영역을 불러오는 중 문제가 발생했습니다.</p>
          <p className="mb-4 text-sm text-red-600">
            {this.state.error?.message ?? "예상하지 못한 오류가 발생했습니다."}
          </p>
          <button
            onClick={this.handleRetry}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
