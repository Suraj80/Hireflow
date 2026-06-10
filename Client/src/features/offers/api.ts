import { api } from "@/lib/api";
import { Offer, OfferFormValues, OfferListResponse, OfferMetaResponse, OfferStatus, PublicOffer } from "@/features/offers/types";

const formatOfferPayload = (values: OfferFormValues) => ({
  candidateId: values.candidateId,
  title: values.title.trim(),
  salaryAmount: values.salaryAmount.trim() ? Number(values.salaryAmount) : null,
  bonusAmount: values.bonusAmount.trim() ? Number(values.bonusAmount) : null,
  equity: values.equity.trim(),
  currency: values.currency.trim().toUpperCase(),
  startDate: values.startDate ? new Date(values.startDate).toISOString() : null,
  expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
  letterHtml: values.letterHtml,
  notes: values.notes.trim(),
});

export const offersApi = {
  list: async (params: { page: number; limit: number; status: string; search: string }) => {
    const response = await api.get<OfferListResponse>("/offers", {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status === "all" ? undefined : params.status,
        search: params.search || undefined,
      },
    });

    return response.data;
  },
  meta: async () => {
    const response = await api.get<OfferMetaResponse>("/offers/meta");
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<Offer>(`/offers/${id}`);
    return response.data;
  },
  create: async (values: OfferFormValues) => {
    const response = await api.post<Offer>("/offers", formatOfferPayload(values));
    return response.data;
  },
  update: async (id: string, values: Omit<OfferFormValues, "candidateId"> & { candidateId?: string }) => {
    const response = await api.patch<Offer>(`/offers/${id}`, formatOfferPayload({ candidateId: values.candidateId || "", ...values }));
    return response.data;
  },
  send: async (id: string, message = "") => {
    const response = await api.post<Offer>(`/offers/${id}/send`, { message });
    return response.data;
  },
  updateStatus: async (id: string, status: OfferStatus, message = "") => {
    const response = await api.patch<Offer>(`/offers/${id}/status`, { status, message });
    return response.data;
  },
  remove: async (id: string) => {
    const response = await api.delete<{ message: string }>(`/offers/${id}`);
    return response.data;
  },
  downloadPdf: async (id: string) => {
    const response = await api.get<Blob>(`/offers/${id}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },
  getPublic: async (token: string) => {
    const response = await api.get<PublicOffer>(`/offers/public/${token}`);
    return response.data;
  },
  downloadPublicPdf: async (token: string) => {
    const response = await api.get<Blob>(`/offers/public/${token}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },
  respondPublic: async (token: string, payload: { decision: "Accepted" | "Declined"; signatureName: string; message: string }) => {
    const response = await api.post<{ message: string; status: OfferStatus; candidateName: string; jobTitle: string }>(
      `/offers/public/${token}/respond`,
      payload
    );
    return response.data;
  },
};
