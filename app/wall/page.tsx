import type { Metadata } from "next";
import { Wall } from "@/wall/Wall";

export const metadata: Metadata = {
  title: "The wall, Tom Larsson",
  description: "A brick wall on a night street, with Tom's tags on it. Walk along it.",
  robots: { index: false },
};

/** The wall at the end of /look, step 1: the street and the walk (Tom 11-14). */
export default function WallPage() {
  return <Wall />;
}
