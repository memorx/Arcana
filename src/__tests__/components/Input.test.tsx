import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="Email" />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders without label", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(screen.getByText("Invalid email")).toHaveClass("text-red-400");
  });

  it("applies error styles when error is present", () => {
    render(<Input label="Email" error="Error" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("border-red-500");
  });

  it("handles value changes", async () => {
    const handleChange = jest.fn();
    render(<Input label="Name" onChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await userEvent.type(input, "John");

    expect(handleChange).toHaveBeenCalled();
  });

  it("renders with different input types", () => {
    const { rerender } = render(<Input type="email" label="Email" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");

    rerender(<Input type="password" label="Password" />);
    // Password inputs don't have textbox role
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("supports required attribute", () => {
    render(<Input label="Required Field" required />);
    expect(screen.getByRole("textbox")).toBeRequired();
  });

  it("supports disabled attribute", () => {
    render(<Input label="Disabled" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("applies custom className", () => {
    render(<Input label="Custom" className="custom-class" />);
    expect(screen.getByRole("textbox")).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = { current: null };
    render(<Input label="With Ref" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("associates label with input via htmlFor", () => {
    render(<Input label="Associated Label" id="my-input" />);
    const label = screen.getByText("Associated Label");
    const input = screen.getByRole("textbox");
    expect(label).toHaveAttribute("for", "my-input");
    expect(input).toHaveAttribute("id", "my-input");
  });
});
