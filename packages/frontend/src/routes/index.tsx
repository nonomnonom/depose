import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '~/app/layouts/AppLayout';
import { RequireAuth } from '~/app/guards/RequireAuth';
import { Login } from '~/features/auth/pages/Login';
import { Signup } from '~/features/auth/pages/Signup';
import { SetupFirm } from '~/features/onboarding/pages/SetupFirm';
import { Matters } from '~/features/matters/pages/Matters';
import { Onboarding } from '~/features/onboarding/pages/Onboarding';
import { FirmSettings } from '~/features/settings/pages/FirmSettings';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/setup', element: <SetupFirm /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/matters" replace /> },
          { path: 'matters', element: <Matters /> },
          { path: 'onboarding', element: <Onboarding /> },
          { path: 'settings', element: <FirmSettings /> },
        ],
      },
    ],
  },
]);