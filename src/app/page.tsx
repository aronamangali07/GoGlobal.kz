import { redirect } from "next/navigation";

// Главная: прокси уже отправил залогиненных дальше; остальных — на вход.
export default function Home() {
  redirect("/login");
}
