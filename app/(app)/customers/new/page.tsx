"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CarForm from "@/components/CarForm";
import RequirePerm from "@/components/RequirePerm";
import { IconBack } from "@/components/icons";
import { PageHead } from "@/components/ui";
import { addCar } from "@/lib/db";

function NewVehicle() {
  const router = useRouter();
  const plate = useSearchParams().get("plate");

  return (
    <RequirePerm perm="customers.create">
      <Link className="back" href="/customers/">
        <IconBack size={16} /> Customers &amp; Vehicles
      </Link>
      <PageHead title="Add vehicle" sub="Scan the number plate or type it in." />
      <div className="narrow">
        <CarForm
          initial={plate ? { plate } : undefined}
          submitLabel="Save vehicle"
          onSubmit={async (data) => {
            const car = await addCar(data);
            router.push(`/customers/view/?id=${car.id}`);
          }}
        />
      </div>
    </RequirePerm>
  );
}

export default function NewVehiclePage() {
  return (
    <Suspense fallback={null}>
      <NewVehicle />
    </Suspense>
  );
}
