// user.model.ts

export interface User {
  _id?: string; // MongoDB ObjectId as a string
  username: string;
  email: string; // 
  password: string;
  firstname?: string,
  lastname?: string;
  is_activated?: boolean;
  is_superuser?: boolean;
  profilePicture?: string;
  created_at?: string;
  last_session?: string;
  currency?: Currency;
}



export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

