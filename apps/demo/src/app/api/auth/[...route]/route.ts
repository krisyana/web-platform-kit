import { bff } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const GET = (req: Request) => bff.handle(req);
export const POST = (req: Request) => bff.handle(req);
