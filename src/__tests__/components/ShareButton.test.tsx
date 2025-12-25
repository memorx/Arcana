import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareButton } from "@/components/ui/ShareButton";

const mockTranslations = {
  share: "Share",
  shareReading: "Share Reading",
  shareDescription: "Make this reading public",
  makePublic: "Make Public",
  makePrivate: "Make Private",
  copyLink: "Copy Link",
  linkCopied: "Link copied!",
  publicReading: "Public reading",
  privateReading: "Private reading",
};

// Mock fetch
global.fetch = jest.fn();

describe("ShareButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ isPublic: false, shareId: null, shareUrl: null }),
    });
  });

  it("renders share button", () => {
    render(
      <ShareButton readingId="test-id" translations={mockTranslations} />
    );
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("opens modal when clicked", async () => {
    render(
      <ShareButton readingId="test-id" translations={mockTranslations} />
    );

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByText("Share Reading")).toBeInTheDocument();
    });
  });

  it("fetches share status when modal opens", async () => {
    render(
      <ShareButton readingId="test-id" translations={mockTranslations} />
    );

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/readings/test-id/share");
    });
  });

  it("shows private status initially", async () => {
    render(
      <ShareButton readingId="test-id" translations={mockTranslations} />
    );

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByText("Private reading")).toBeInTheDocument();
    });
  });

  it("shows public status and share link when public", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          isPublic: true,
          shareId: "abc123",
          shareUrl: "https://example.com/share/abc123",
        }),
    });

    render(
      <ShareButton readingId="test-id" translations={mockTranslations} />
    );

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByText("Public reading")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://example.com/share/abc123")).toBeInTheDocument();
    });
  });

  it("toggles share status when button clicked", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isPublic: false, shareId: null, shareUrl: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            isPublic: true,
            shareId: "abc123",
            shareUrl: "https://example.com/share/abc123",
          }),
      });

    render(
      <ShareButton readingId="test-id" translations={mockTranslations} />
    );

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByText("Make Public")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Make Public"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/readings/test-id/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });
    });
  });

  it("copies link to clipboard when copy button clicked", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          isPublic: true,
          shareId: "abc123",
          shareUrl: "https://example.com/share/abc123",
        }),
    });

    render(
      <ShareButton readingId="test-id" translations={mockTranslations} />
    );

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByText("Copy Link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Copy Link"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://example.com/share/abc123"
      );
    });
  });
});
