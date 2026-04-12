export type AdminItem = {
  id: string;
  adminId: string;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
};

export const INITIAL_ADMINS: AdminItem[] = [
  {
    id: "admin-1",
    adminId: "ADM-001",
    firstName: "John",
    lastName: "Doe",
    birthday: "01/12/1990",
    email: "john.doe@parseit.edu",
  },
  {
    id: "admin-2",
    adminId: "ADM-002",
    firstName: "Jane",
    lastName: "Smith",
    birthday: "08/23/1992",
    email: "jane.smith@parseit.edu",
  },
];

let adminRecords: AdminItem[] = [...INITIAL_ADMINS];

export function getAdminRecords() {
  return adminRecords;
}

export function addAdminRecord(
  payload: Omit<AdminItem, "id"> & { id?: string }
): AdminItem {
  const newRecord: AdminItem = {
    id: payload.id || `admin-${Date.now()}`,
    adminId: payload.adminId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    birthday: payload.birthday,
    email: payload.email,
  };

  adminRecords = [newRecord, ...adminRecords];
  return newRecord;
}

export function updateAdminRecord(updatedItem: AdminItem) {
  adminRecords = adminRecords.map((item) =>
    item.id === updatedItem.id ? updatedItem : item
  );
}

export function deleteAdminRecord(id: string) {
  adminRecords = adminRecords.filter((item) => item.id !== id);
}

export function getAdminCount() {
  return adminRecords.length;
}