import React from "react";
import "./Button.model.scss";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  loading = false,
  disabled,
  ...rest
}) => {
  return (
    <button
      className={`button ${variant}`}
      disabled={loading || disabled}
      {...rest}
    >
      {loading ? <span className="loader" /> : children}
    </button>
  );
};

export default Button;
