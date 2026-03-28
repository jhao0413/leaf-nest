export interface SessionUser {
  id: string;
  email?: string | null;
}

export interface SessionRecord {
  id: string;
  userId?: string;
}

export interface AuthSession {
  user: SessionUser;
  session: SessionRecord;
}

export interface AuthLike {
  handler: (request: Request) => Promise<Response>;
  api: {
    getSession: (context: {
      headers: Headers;
      query?: {
        disableCookieCache?: boolean;
        disableRefresh?: boolean;
      };
    }) => Promise<AuthSession | null>;
  };
}
