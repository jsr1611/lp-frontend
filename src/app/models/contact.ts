// A reusable person the user borrows from / lends to.
export interface Contact {
  _id?: string;
  userId?: string;
  name: string; // required
  phone?: string;
  email?: string;
  telegram?: string;
  whatsapp?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}
