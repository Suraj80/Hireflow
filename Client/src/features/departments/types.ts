export type DepartmentItem = {
  id: string;
  name: string;
  isActive: boolean;
  isLegacy?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DepartmentsListResponse = {
  items: DepartmentItem[];
};
