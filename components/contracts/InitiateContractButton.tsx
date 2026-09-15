"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Handshake, Loader2 } from "lucide-react";

export interface InitiateContractButtonProps {
  listingId: string;
  supplierId: string;
  startupId: string;
  startupName?: string;
}

export default function InitiateContractButton({
  listingId,
  supplierId,
  startupId,
  startupName,
}: InitiateContractButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInitiate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, supplierId, startupId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate contract.");
      }

      router.push(`/contracts/${data._id}`);
    } catch (err: any) {
      alert(err.message || "Failed to initiate contract.");
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleInitiate}
      disabled={isLoading}
      size="sm"
      className="bg-blue-600 text-white hover:bg-blue-700 shrink-0 font-medium text-xs shadow-md shadow-blue-600/20"
    >
      {isLoading ? (
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Initiating...
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <Handshake className="h-3.5 w-3.5" />
          Initiate Contract
        </span>
      )}
    </Button>
  );
}
