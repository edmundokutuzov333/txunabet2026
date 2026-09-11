'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function AdminPanel() {
    const { toast } = useToast();
    const [emailToPromote, setEmailToPromote] = useState('');
    const [secret, setSecret] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePromote = async () => {
        if (!emailToPromote) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira um email.' });
            return;
        }

        setIsLoading(true);
        try {
            const functions = getFunctions();
            const setAdminRole = httpsCallable(functions, 'setAdminRole');
            const result: any = await setAdminRole({ email: emailToPromote, adminSecret: secret });

            toast({
                title: 'Sucesso!',
                description: result.data.message,
            });
            setEmailToPromote('');
            setSecret('');
        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erro ao promover utilizador',
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="gradient-surface border-0 rounded-2xl border-primary/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="text-primary"/>Painel de Administração</CardTitle>
                <CardDescription>Gerir permissões de administrador. Use com precaução.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email-promote">Email do Utilizador a Promover</Label>
                    <Input 
                        id="email-promote" 
                        type="email" 
                        placeholder="utilizador@txunabet.com" 
                        className="bg-card border-border"
                        value={emailToPromote}
                        onChange={(e) => setEmailToPromote(e.target.value)}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="admin-secret">Chave Mestra de Admin (Opcional)</Label>
                    <Input 
                        id="admin-secret" 
                        type="password" 
                        placeholder="Apenas para a primeira promoção" 
                        className="bg-card border-border"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                    />
                </div>
                <Button className="w-full btn-primary-gradient" onClick={handlePromote} disabled={isLoading}>
                    {isLoading ? 'A promover...' : 'Promover a Administrador'}
                </Button>
            </CardContent>
        </Card>
    );
};