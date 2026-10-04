import { useContext } from "react";
import { ToastContext } from "./toastContextValue";

export function useToast() {
  return useContext(ToastContext);
}
