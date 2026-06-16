export type UserRole = "admin" | "recruiter" | "viewer";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  status: string;
};

export type UsersListResponse = {
  items: UserListItem[];
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
};
