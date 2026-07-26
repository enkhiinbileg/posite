import { WeeklySchedule } from "@/components/home/WeeklySchedule";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Хуваарь - MyToon",
    description: "Вебтоон орох өдрийн хуваарь",
};

export default function SchedulePage() {
    return (
        <main className="min-h-screen pt-14 pb-20 px-2 md:px-10 max-w-[1600px] mx-auto">
            <WeeklySchedule />
        </main>
    );
}
