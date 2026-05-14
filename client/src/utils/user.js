/** Matches login/register payloads (`id`) and Mongoose `/auth/me` (`_id`). */
export function getUserId(user) {
  if (!user) return null;
  const raw = user.id ?? user._id;
  return raw != null ? String(raw) : null;
}
