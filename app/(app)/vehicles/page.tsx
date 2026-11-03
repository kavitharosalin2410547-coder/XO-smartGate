import { Suspense } from "react";
import VehiclesScreen from "@/components/accounts/VehiclesScreen";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VehiclesScreen />
    </Suspense>
  );
}
