import Image, { ImageProps } from "next/image";

// a user's profile picture. google pictures go through next's image
// optimiser, but custom ones come from our own /api/users/[id]/image route -
// that needs the browser's sign in cookie, which the optimiser doesn't send,
// so those load directly
export default function AvatarImage({ src, alt, ...props }: ImageProps) {
  const isOwnRoute = typeof src === "string" && src.startsWith("/api/");
  return <Image src={src} alt={alt} unoptimized={isOwnRoute} {...props} />;
}
