import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";

describe("Modal", () => {
  it("renders when isOpen is true", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalBody>Modal content</ModalBody>
      </Modal>
    );
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <ModalBody>Modal content</ModalBody>
      </Modal>
    );
    expect(screen.queryByText("Modal content")).not.toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <ModalBody>Content</ModalBody>
      </Modal>
    );

    // Click on the backdrop (the outer div with fixed positioning)
    const backdrop = screen.getByRole("dialog").parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  it("does not close when modal content is clicked", () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <ModalBody>Content</ModalBody>
      </Modal>
    );

    fireEvent.click(screen.getByText("Content"));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("calls onClose when escape key is pressed", () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <ModalBody>Content</ModalBody>
      </Modal>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("has proper dialog role and aria-modal", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalBody>Content</ModalBody>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});

describe("ModalHeader", () => {
  it("renders children", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalHeader>
          <h2>Header Title</h2>
        </ModalHeader>
      </Modal>
    );
    expect(screen.getByText("Header Title")).toBeInTheDocument();
  });

  it("has bottom border styling", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalHeader>Header</ModalHeader>
      </Modal>
    );
    // getByText returns the element containing the text directly
    const header = screen.getByText("Header");
    expect(header).toHaveClass("border-b");
  });
});

describe("ModalBody", () => {
  it("renders children", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalBody>Body content</ModalBody>
      </Modal>
    );
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("has proper padding", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalBody>Content</ModalBody>
      </Modal>
    );
    const content = screen.getByText("Content");
    expect(content).toHaveClass("p-6");
  });
});

describe("ModalFooter", () => {
  it("renders children", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalFooter>Footer content</ModalFooter>
      </Modal>
    );
    expect(screen.getByText("Footer content")).toBeInTheDocument();
  });

  it("has flex layout with gap", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <ModalFooter>Footer</ModalFooter>
      </Modal>
    );
    const footer = screen.getByText("Footer");
    expect(footer).toHaveClass("flex", "gap-3");
  });
});

describe("Modal composition", () => {
  it("renders complete modal with all parts", () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        <ModalHeader>
          <h2>Modal Title</h2>
        </ModalHeader>
        <ModalBody>Modal body content</ModalBody>
        <ModalFooter>
          <button onClick={handleClose}>Close</button>
        </ModalFooter>
      </Modal>
    );

    expect(screen.getByText("Modal Title")).toBeInTheDocument();
    expect(screen.getByText("Modal body content")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });
});

describe("Modal accessibility (§5.7)", () => {
  function Harness({ withTitle = true }: { withTitle?: boolean }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Abrir</button>
        <button>Afuera</button>
        <Modal isOpen={open} onClose={() => setOpen(false)}>
          {withTitle && (
            <ModalHeader>
              <h2>Logro nuevo</h2>
            </ModalHeader>
          )}
          <ModalBody>
            <button>Uno</button>
            <a href="/achievements">Dos</a>
          </ModalBody>
          <ModalFooter>
            <button onClick={() => setOpen(false)}>Tres</button>
          </ModalFooter>
        </Modal>
      </>
    );
  }

  it("sits on ink and is named by its title", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));

    const dialog = screen.getByRole("dialog", { name: "Logro nuevo" });
    expect(dialog).toHaveClass("suelo-tinta");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("moves focus inside, keeps Tab and Shift+Tab inside, and locks the page scroll", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));

    expect(screen.getByRole("button", { name: "Uno" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 7; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    // forward: Uno → Dos → Tres → Uno
    screen.getByRole("button", { name: "Uno" }).focus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Dos" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Tres" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Uno" })).toHaveFocus();
    // backward from the first one goes to the last one
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Tres" })).toHaveFocus();
  });

  it("Esc closes it, the scroll comes back and focus returns to the trigger", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closing from a button inside also returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Tres" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("accepts an explicit aria-label when there is no title", () => {
    render(
      <Modal isOpen onClose={() => {}} aria-label="Carta dorada">
        <ModalBody>Sin título</ModalBody>
      </Modal>
    );
    expect(screen.getByRole("dialog", { name: "Carta dorada" })).toBeInTheDocument();
  });

  it("a drag that starts inside and ends on the backdrop does not close it", () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen onClose={handleClose}>
        <ModalBody>Contenido</ModalBody>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.mouseDown(dialog);
    fireEvent.click(dialog.parentElement!);
    expect(handleClose).not.toHaveBeenCalled();
    fireEvent.click(dialog.parentElement!);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
