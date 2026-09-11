
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Languages, Palette, Accessibility, FileDown, Sun, Moon, Bell, Shield, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { useUser } from '@/firebase';
import AdminPanel from './_components/admin-panel';
import { ROLES } from '@/config/roles';


const translations: any = {
    pt: {
        title: "Configurações",
        generalTitle: "Geral",
        generalDescription: "Defina o idioma e o fuso horário da aplicação.",
        language: "Idioma",
        languagePlaceholder: "Selecione o idioma",
        portuguese: "Português",
        english: "English",
        french: "Français",
        spanish: "Español",
        timezone: "Fuso Horário",
        timezonePlaceholder: "Selecione o fuso horário",
        saveChanges: "Salvar Alterações",
        appearanceTitle: "Aparência",
        appearanceDescription: "Personalize a aparência da interface.",
        theme: "Tema",
        dark: "Escuro",
        light: "Claro",
        fontSize: "Tamanho da Fonte",
        fontSizePlaceholder: "Selecione o tamanho",
        small: "Pequeno",
        medium: "Médio",
        large: "Grande",
        notificationsTitle: "Notificações",
        notificationsDescription: "Escolha como e quando quer ser notificado.",
        emailNotifications: "Notificações por Email",
        emailNotificationsDesc: "Receba resumos e alertas importantes.",
        pushNotifications: "Notificações no browser",
        pushNotificationsDesc: "Alertas em tempo real.",
        mentionsNotifications: "Apenas menções e tarefas",
        mentionsNotificationsDesc: "Receba alertas apenas quando for mencionado.",
        accessibilityTitle: "Acessibilidade",
        accessibilityDescription: "Ajustes para melhorar a sua experiência.",
        highContrast: "Modo de Alto Contraste",
        highContrastDesc: "Aumenta o contraste das cores para melhor legibilidade.",
        reducedMotion: "Reduzir Movimento",
        reducedMotionDesc: "Desativa animações e transições na interface.",
        voiceOver: "Voice Over (TTS)",
        voiceOverDesc: "Ativa a leitura de texto em voz alta para navegação.",
        dataPrivacyTitle: "Dados e Privacidade",
        dataPrivacyDescription: "Faça a gestão dos seus dados pessoais.",
        exportData: "Exportar Meus Dados",
        exportDataDesc: "Faça o download de todos os seus dados em formato JSON.",
        export: "Exportar",
        toastTitle: "Configurações Salvas",
        toastDescription: (section: string) => `As suas configurações de ${section} foram atualizadas com sucesso.`
    },
    en: {
        title: "Settings",
        generalTitle: "General",
        generalDescription: "Set the application language and timezone.",
        language: "Language",
        languagePlaceholder: "Select language",
        portuguese: "Português",
        english: "English",
        french: "Français",
        spanish: "Español",
        timezone: "Timezone",
        timezonePlaceholder: "Select timezone",
        saveChanges: "Save Changes",
        appearanceTitle: "Appearance",
        appearanceDescription: "Customize the interface's appearance.",
        theme: "Tema",
        dark: "Dark",
        light: "Light",
        fontSize: "Font Size",
        fontSizePlaceholder: "Select size",
        small: "Small",
        medium: "Medium",
        large: "Large",
        notificationsTitle: "Notifications",
        notificationsDescription: "Choose how and when you want to be notified.",
        emailNotifications: "Email Notifications",
        emailNotificationsDesc: "Receive important summaries and alerts.",
        pushNotifications: "Browser Notifications",
        pushNotificationsDesc: "Real-time alerts.",
        mentionsNotifications: "Only mentions and tasks",
        mentionsNotificationsDesc: "Receive alerts only when you are mentioned.",
        accessibilityTitle: "Accessibility",
        accessibilityDescription: "Adjustments to improve your experience.",
        highContrast: "High Contrast Mode",
        highContrastDesc: "Increases color contrast for better readability.",
        reducedMotion: "Reduce Motion",
        reducedMotionDesc: "Disables animations and transitions in the interface.",
        voiceOver: "Voice Over (TTS)",
        voiceOverDesc: "Enables text-to-speech for navigation.",
        dataPrivacyTitle: "Data & Privacy",
        dataPrivacyDescription: "Manage your personal data.",
        exportData: "Export My Data",
        exportDataDesc: "Download all your data in JSON format.",
        export: "Export",
        toastTitle: "Settings Saved",
        toastDescription: (section: string) => `Your ${section} settings have been successfully updated.`
    }
};

export default function SettingsPage() {
    const { toast } = useToast();
    const { setTheme, theme } = useTheme();
    const [lang, setLang] = useState('pt');
    const { user } = useUser();
    const t = translations[lang] || translations.en;

    const handleSaveChanges = (section: string) => {
        toast({
            title: t.toastTitle,
            description: t.toastDescription(section),
        });
    };

    return (
        <div className="p-6 fade-in">
            <h1 className="text-3xl font-bold text-foreground mb-8">{t.title}</h1>
            
            {user?.role === ROLES.ADMIN && (
                <div className="mb-8">
                    <AdminPanel />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                <div className="space-y-8">
                    <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Languages className="text-primary"/>{t.generalTitle}</CardTitle>
                            <CardDescription>{t.generalDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="language">{t.language}</Label>
                                <Select defaultValue="pt" onValueChange={setLang}>
                                    <SelectTrigger id="language" className="bg-card border-border">
                                        <SelectValue placeholder={t.languagePlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pt">{t.portuguese}</SelectItem>
                                        <SelectItem value="en">{t.english}</SelectItem>
                                        <SelectItem value="fr">{t.french}</SelectItem>
                                        <SelectItem value="es">{t.spanish}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="timezone">{t.timezone}</Label>
                                <Select defaultValue="africa-maputo">
                                    <SelectTrigger id="timezone" className="bg-card border-border">
                                        <SelectValue placeholder={t.timezonePlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="africa-maputo">(GMT+02:00) Maputo</SelectItem>
                                        <SelectItem value="europe-lisbon">(GMT+01:00) Lisbon</SelectItem>
                                        <SelectItem value="utc">(GMT+00:00) UTC</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full btn-primary-gradient" onClick={() => handleSaveChanges(t.generalTitle)}>{t.saveChanges}</Button>
                        </CardContent>
                    </Card>

                    <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="text-primary"/>{t.notificationsTitle}</CardTitle>
                            <CardDescription>{t.notificationsDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                <Label htmlFor="email-notifications" className="flex flex-col gap-1 cursor-pointer">
                                    <span>{t.emailNotifications}</span>
                                    <span className="text-xs text-muted-foreground">{t.emailNotificationsDesc}</span>
                                </Label>
                                <Switch id="email-notifications" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                <Label htmlFor="push-notifications" className="flex flex-col gap-1 cursor-pointer">
                                    <span>{t.pushNotifications}</span>
                                    <span className="text-xs text-muted-foreground">{t.pushNotificationsDesc}</span>
                                </Label>
                                <Switch id="push-notifications" defaultChecked />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                <Label htmlFor="mentions-notifications" className="flex flex-col gap-1 cursor-pointer">
                                    <span>{t.mentionsNotifications}</span>
                                    <span className="text-xs text-muted-foreground">{t.mentionsNotificationsDesc}</span>
                                </Label>
                                <Switch id="mentions-notifications" />
                            </div>
                            <Button className="w-full btn-primary-gradient mt-4" onClick={() => handleSaveChanges(t.notificationsTitle)}>{t.saveChanges}</Button>
                        </CardContent>
                    </Card>

                     <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileDown className="text-primary"/>{t.dataPrivacyTitle}</CardTitle>
                            <CardDescription>{t.dataPrivacyDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                            <div>
                                <h4 className="font-semibold">{t.exportData}</h4>
                                <p className="text-sm text-muted-foreground">{t.exportDataDesc}</p>
                            </div>
                            <Button variant="outline" className="bg-card border-border">{t.export}</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                     <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Palette className="text-primary"/>{t.appearanceTitle}</CardTitle>
                            <CardDescription>{t.appearanceDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>{t.theme}</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button variant="outline" onClick={() => setTheme('dark')} className={`h-20 flex flex-col items-center justify-center bg-card border-border ${theme === 'dark' ? 'ring-2 ring-primary border-primary' : ''}`}>
                                        <Moon className="w-6 h-6 mb-2"/>
                                        <span>{t.dark}</span>
                                    </Button>
                                    <Button variant="outline" onClick={() => setTheme('light')} className={`h-20 flex flex-col items-center justify-center bg-card border-border ${theme === 'light' ? 'ring-2 ring-primary border-primary' : ''}`}>
                                        <Sun className="w-6 h-6 mb-2"/>
                                        <span>{t.light}</span>
                                    </Button>
                                </div>
                            </div>
                            <Button className="w-full btn-primary-gradient" onClick={() => handleSaveChanges(t.appearanceTitle)}>{t.saveChanges}</Button>
                        </CardContent>
                    </Card>

                    <Card className="gradient-surface border-0 rounded-2xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Accessibility className="text-primary"/>{t.accessibilityTitle}</CardTitle>
                            <CardDescription>{t.accessibilityDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="font-size">{t.fontSize}</Label>
                                <Select defaultValue="medium">
                                    <SelectTrigger id="font-size" className="bg-card border-border">
                                        <SelectValue placeholder={t.fontSizePlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">{t.small}</SelectItem>
                                        <SelectItem value="medium">{t.medium}</SelectItem>
                                        <SelectItem value="large">{t.large}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                <Label htmlFor="high-contrast" className="flex flex-col gap-1 cursor-pointer">
                                    <span>{t.highContrast}</span>
                                    <span className="text-xs text-muted-foreground">{t.highContrastDesc}</span>
                                </Label>
                                <Switch id="high-contrast" />
                            </div>
                             <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                <Label htmlFor="voice-over" className="flex flex-col gap-1 cursor-pointer">
                                    <span>{t.voiceOver}</span>
                                    <span className="text-xs text-muted-foreground">{t.voiceOverDesc}</span>
                                </Label>
                                <Switch id="voice-over" />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg">
                                <Label htmlFor="reduced-motion" className="flex flex-col gap-1 cursor-pointer">
                                    <span>{t.reducedMotion}</span>
                                    <span className="text-xs text-muted-foreground">{t.reducedMotionDesc}</span>
                                </Label>
                                <Switch id="reduced-motion" defaultChecked />
                            </div>
                            <Button className="w-full btn-primary-gradient mt-4" onClick={() => handleSaveChanges(t.accessibilityTitle)}>{t.saveChanges}</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
