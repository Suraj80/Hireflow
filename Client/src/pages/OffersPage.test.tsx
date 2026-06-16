// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OffersPage from "@/pages/OffersPage";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/features/offers/api", () => ({
  offersApi: {
    list: vi.fn(),
    meta: vi.fn(),
    send: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
    downloadPdf: vi.fn(),
  },
}));

import { offersApi } from "@/features/offers/api";

describe("OffersPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(offersApi.list).mockResolvedValue({
      items: [
        {
          id: "offer-1",
          candidate: { id: "candidate-1", name: "Taylor Brooks", email: "taylor@example.com", stage: "Offer", recruiterAssigned: null },
          job: { id: "job-1", title: "Senior Designer", department: "Design" },
          title: "Senior Designer",
          salaryAmount: 120000,
          bonusAmount: 10000,
          equity: "",
          currency: "USD",
          startDate: null,
          expiresAt: null,
          letterHtml: "<p>Offer</p>",
          notes: "",
          status: "Draft",
          version: 1,
          versions: [],
          shareUrl: "http://localhost/offers/token",
          sentAt: null,
          respondedAt: null,
          withdrawnAt: null,
          decisionName: "",
          decisionMessage: "",
          createdBy: null,
          updatedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      filters: { statuses: ["Draft", "Sent", "Accepted", "Declined", "Withdrawn", "Expired"] },
    });
    vi.mocked(offersApi.meta).mockResolvedValue({
      candidates: [],
      statuses: ["Draft", "Sent", "Accepted", "Declined", "Withdrawn", "Expired"],
    });
  });

  it("navigates to the dedicated offer view page when view is clicked", async () => {
    render(<OffersPage />);

    await waitFor(() => {
      expect(screen.getByText("Taylor Brooks")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("View offer for Taylor Brooks"));

    expect(navigateMock).toHaveBeenCalledWith("/offers/view/offer-1");
  });
});
