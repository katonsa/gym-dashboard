import { revalidatePath } from "next/cache"

export function revalidateOwnerGymLayout() {
  revalidatePath("/", "layout")
}

export function revalidateOwnerGymCreatedPaths() {
  revalidatePath("/", "layout")
  revalidatePath("/")
  revalidatePath("/settings")
  revalidatePath("/drop-ins")
  revalidatePath("/members")
  revalidatePath("/subscriptions")
}

export function revalidateGymSettingsPaths() {
  revalidatePath("/settings")
  revalidatePath("/drop-ins")
  revalidatePath("/")
  revalidatePath("/", "layout")
}

export function revalidatePlanTierManagementPaths() {
  revalidatePath("/settings")
  revalidatePath("/members")
  revalidatePath("/members/[id]", "page")
  revalidatePath("/subscriptions")
  revalidatePath("/")
}
