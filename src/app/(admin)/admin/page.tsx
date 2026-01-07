import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Dashboard</CardTitle>
              <div className="mt-2 text-sm text-white/60">Kategoriler • Özellikler • İlişkiler</div>
            </div>
            <Button variant="primary">Yeni Ekle</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold tracking-widest text-white/40">KATEGORİ</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-3xl font-black">—</div>
                <Badge variant="active">AKTİF</Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold tracking-widest text-white/40">ÖZELLİK</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-3xl font-black">—</div>
                <Badge>TIP</Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-bold tracking-widest text-white/40">BAĞLANTI</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-3xl font-black">—</div>
                <Badge variant="inactive">PASİF</Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-lg font-extrabold">Hızlı Git</div>
              <div className="mt-2 text-sm text-white/60">İlk önce Kategoriler ve Özellikler.</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button className="w-full md:w-auto">Kategoriler</Button>
                <Button className="w-full md:w-auto">Özellikler</Button>
                <Button className="w-full md:w-auto">Kategori-Özellikleri</Button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-lg font-extrabold">Durum</div>
              <div className="mt-2 text-sm text-white/60">Kabuğu bitiriyoruz. Sonra sayfalar iskelet.</div>
              <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                <div className="h-2 w-[35%] rounded-full bg-[#D9A400]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
