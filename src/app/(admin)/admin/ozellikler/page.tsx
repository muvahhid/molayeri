import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OzelliklerPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Özellikler</CardTitle>
            <div className="mt-2 text-sm text-white/60">Liste burada</div>
          </div>
          <Button variant="primary">Yeni Ekle</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
          Liste burada (placeholder)
        </div>
      </CardContent>
    </Card>
  );
}
