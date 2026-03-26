"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AuthBackButton() {
  return (
    <Button asChild variant="ghost" size="sm" className="w-fit">
      <Link href="/">
        <ChevronLeft />
        Back
      </Link>
    </Button>
  );
}
