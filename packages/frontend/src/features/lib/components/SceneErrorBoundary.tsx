import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from '~/features/layout/ErrorPage';

interface Props {
  sceneId: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Scene-level boundary: a broken scene must not take down the whole shell. */
export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Scene ${this.props.sceneId} failed`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorState
          title="This page could not load"
          message={this.state.error.message || 'An unexpected error occurred.'}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
