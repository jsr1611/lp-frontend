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
  // "yyyy-MM-dd"; only month and day are used, for the work log's birthday greeting.
  birthday?: string | null;
}



export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

