import { redirect } from 'next/navigation';

// "/" had no page before; send people to the dashboard (Navbar bounces to /AdminLogin if not signed in)
export default function Home() {
  redirect('/Dashboard');
}
