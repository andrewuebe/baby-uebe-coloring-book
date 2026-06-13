export function assertAdmin(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key') ?? req.headers.get('x-admin-key');
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    throw new Response('forbidden', { status: 403 });
  }
}
