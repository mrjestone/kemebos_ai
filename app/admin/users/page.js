import UsersView from "./UsersView";

// Gated by a client-side session check, so navigation into it is not "instant".
export const instant = false;

export default function Page() {
  return <UsersView />;
}
