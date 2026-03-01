import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Flag, CheckCircle2, Minus, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Objectifs() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    title: "",
    description: "",
    year: currentYear,
    unit: "livres",
    target_count: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(()=>{});
  }, []);

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ["objectives", user?.email, form.year],
    queryFn: async () => {
      const list = await base44.entities.ReadingObjective.filter({ created_by: user?.email, year: form.year }, "-updated_date", 100);
      return list;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReadingObjective.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReadingObjective.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReadingObjective.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["objectives"] }),
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: "", description: "", year: currentYear, unit: "livres", target_count: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      year: Number(form.year) || currentYear,
      target_count: form.target_count ? Number(form.target_count) : undefined,
      status: "Non commencé",
      progress_count: 0,
    };
    if (editingId) updateMutation.mutate({ id: editingId, data: payload });
    else createMutation.mutate(payload);
  };

  const setEditing = (obj) => {
    setEditingId(obj.id);
    setForm({
      title: obj.title || "",
      description: obj.description || "",
      year: obj.year || currentYear,
      unit: obj.unit || "livres",
      target_count: obj.target_count ?? "",
    });
  };

  const bumpProgress = (obj, delta) => {
    const next = Math.max(0, (obj.progress_count || 0) + delta);
    const status = obj.target_count && next >= obj.target_count ? "Terminé" : (next > 0 ? "En cours" : "Non commencé");
    updateMutation.mutate({ id: obj.id, data: { progress_count: next, status } });
  };

  const markDone = (obj) => updateMutation.mutate({ id: obj.id, data: { status: "Terminé", progress_count: obj.target_count || obj.progress_count || 0 } });

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 40%, #F9F0FA 70%, #F5F0FF 100%)' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between p-5 rounded-3xl shadow-lg mb-6"
             style={{ background: '#FCE8F8', border: '1px solid #F4BDE9' }}>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#A81F8C' }}>📌 Objectifs</h1>
          <div className="flex items-center gap-2">
            <Select value={String(form.year)} onValueChange={(v) => setForm((f) => ({ ...f, year: Number(v) }))}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Année" /></SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Flag className="w-5 h-5 text-pink-600"/> Nouvel objectif</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-5 gap-3">
              <Input className="md:col-span-2" placeholder="Titre (ex: Lire 3 livres en anglais)" value={form.title} onChange={(e)=>setForm({ ...form, title: e.target.value })} />
              <Select value={form.unit} onValueChange={(v)=>setForm({ ...form, unit: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Unité"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="livres">Livres</SelectItem>
                  <SelectItem value="pages">Pages</SelectItem>
                  <SelectItem value="jours">Jours</SelectItem>
                  <SelectItem value="pourcentage">Pourcentage</SelectItem>
                  <SelectItem value="aucun">Aucun</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" min="0" placeholder="Cible (ex: 3)" value={form.target_count} onChange={(e)=>setForm({ ...form, target_count: e.target.value })} />
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700">{editingId ? "Mettre à jour" : "Ajouter"}</Button>
              <Textarea className="md:col-span-5" placeholder="Description (optionnel)" value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} />
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <AnimatePresence>
            {isLoading ? (
              <p className="text-center text-gray-500 py-8">Chargement…</p>
            ) : objectives.length === 0 ? (
              <Card className="p-8 text-center">Aucun objectif pour {form.year}. Ajoutez-en un !</Card>
            ) : (
              objectives.map((obj) => {
                const pct = obj.target_count ? Math.min(100, Math.round(((obj.progress_count || 0) / obj.target_count) * 100)) : (obj.status === "Terminé" ? 100 : 0);
                return (
                  <motion.div key={obj.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                    <Card className="bg-white/90">
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg line-clamp-2">{obj.title}</h3>
                            {obj.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{obj.description}</p>}
                            <div className="mt-3">
                              <Progress value={pct} />
                              <p className="text-xs text-gray-500 mt-1">{obj.progress_count || 0}{obj.unit !== 'aucun' ? ` ${obj.unit}` : ''}{obj.target_count ? ` / ${obj.target_count}` : ''} · {pct}%</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => bumpProgress(obj, -1)}><Minus className="w-4 h-4"/></Button>
                            <Button variant="outline" size="icon" onClick={() => bumpProgress(obj, +1)}><Plus className="w-4 h-4"/></Button>
                            <Button variant="outline" onClick={() => markDone(obj)} className="gap-2"><CheckCircle2 className="w-4 h-4 text-green-600"/> Terminé</Button>
                            <Button variant="outline" size="icon" onClick={() => setEditing(obj)}><Pencil className="w-4 h-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(obj.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}