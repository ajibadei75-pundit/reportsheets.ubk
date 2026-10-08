import { Component } from "react";
import logo from "../assets/logo.jpg";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="login-wrap">
          <div className="login-box">
            <img src={logo} alt="" />
            <h3>Something went wrong</h3>
            <p className="hint">
              The page hit an unexpected error and couldn't continue. Reloading usually fixes this;
              if it keeps happening, please tell the school admin what you were doing when it happened.
            </p>
            <p className="err" style={{ wordBreak: "break-word" }}>{String(this.state.error.message || this.state.error)}</p>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
