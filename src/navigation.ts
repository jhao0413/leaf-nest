import { useLocation, useNavigate, useParams as useReactRouterParams } from 'react-router-dom';

export function useRouter() {
  const navigate = useNavigate();

  return {
    push: (to: string) => navigate(to),
    replace: (to: string) => navigate(to, { replace: true }),
    back: () => navigate(-1)
  };
}

export function usePathname() {
  return useLocation().pathname;
}

export function useParams<
  TParams extends Record<string, string | undefined> = Record<string, string | undefined>
>() {
  return useReactRouterParams() as TParams;
}
