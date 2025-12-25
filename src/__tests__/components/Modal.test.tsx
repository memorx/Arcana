import { render, screen, fireEvent } from "@testing-library/react";
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
