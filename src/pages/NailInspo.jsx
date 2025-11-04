
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Palette, Plus, Check } from "lucide-react";
import AddNailInspoDialog from "../components/nailinspo/AddNailInspoDialog";
import NailInspoGallery from "../components/nailinspo/NailInspoGallery";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NailInspo() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filter, setFilter] = useState("all");

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: nailInspos = [], isLoading } = useQuery({
    queryKey: ['nailInspos'],
    queryFn: () => base44.entities.NailInspo.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const filteredInspos = filter === "all" 
    ? nailInspos 
    : filter === "done"
    ? nailInspos.filter(i => i.is_done)
    : nailInspos.filter(i => !i.is_done);

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <Palette className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Inspi Ongles 💅
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {nailInspos.length} inspiration{nailInspos.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="shadow-lg text-white font-medium px-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <Plus className="w-5 h-5 mr-2" />
            Ajouter une inspi
          </Button>
        </div>

        <div className="mb-6">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0">
              <TabsTrigger value="all" className="data-[state=active]:text-white rounded-lg">
                Tous ({nailInspos.length})
              </TabsTrigger>
              <TabsTrigger value="todo" className="data-[state=active]:text-white rounded-lg">
                À faire ({nailInspos.filter(i => !i.is_done).length})
              </TabsTrigger>
              <TabsTrigger value="done" className="data-[state=active]:text-white rounded-lg">
                <Check className="w-4 h-4 mr-1" />
                Fait ({nailInspos.filter(i => i.is_done).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <NailInspoGallery 
          nailInspos={filteredInspos}
          allBooks={allBooks}
          isLoading={isLoading}
        />

        <AddNailInspoDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          books={allBooks}
        />
      </div>
    </div>
  );
}
