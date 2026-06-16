import { redirect } from 'next/navigation';

export default function PortalRoot() {
  // /portal/  →  /portal/login/
  redirect('/portal/login/');
}
