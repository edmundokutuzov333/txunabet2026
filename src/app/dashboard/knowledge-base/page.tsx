
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { knowledgeBase } from '@/lib/data';
import { Eye, Search, Tag } from 'lucide-react';

export default function KnowledgeBasePage() {
  return (
    <div className="p-6 fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-2">Base de Conhecimento</h1>
        <p className="text-muted-foreground mb-8">Encontre guias, políticas e artigos úteis da empresa.</p>
        <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input type="text" placeholder="Pesquisar artigos..." className="w-full pl-12 pr-4 py-3 h-auto bg-card border-border rounded-xl focus:outline-none focus:border-primary text-foreground" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {knowledgeBase.map(article => (
                <Card key={article.id} className="gradient-surface border-0 rounded-2xl hover:shadow-xl transition-shadow cursor-pointer p-6">
                   <CardHeader className="p-0">
                     <Badge variant="secondary" className="bg-primary/20 text-primary w-fit mb-4">{article.category}</Badge>
                     <CardTitle className="text-lg font-bold text-foreground mb-2">{article.title}</CardTitle>
                   </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex items-center text-xs text-muted-foreground mt-4 space-x-4">
                            <span className="flex items-center gap-1.5"><Eye className="w-4 h-4"/> {article.views} visualizações</span>
                            <span className="flex items-center gap-1.5"><Tag className="w-4 h-4"/> {article.tags.join(', ')}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
