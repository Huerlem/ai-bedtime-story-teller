import { redirect } from 'next/navigation';
// The profile editor is a component needing child/onUpdate/onCancel props,
// not a Next.js route page. Redirect legacy bookmarks to management.
export default function ChildProfileManagerPage() { redirect('/my-children'); }
