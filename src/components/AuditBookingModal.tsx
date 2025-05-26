
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, MapPin, Video, ArrowLeft, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AuditBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const timeSlots = [
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

const revenueRanges = [
  { value: '0-1M', label: '0 - 1 million CFA' },
  { value: '1-2M', label: '1 - 2 millions CFA' },
  { value: '2-5M', label: '2 - 5 millions CFA' },
  { value: '5-10M', label: '5 - 10 millions CFA' },
  { value: '10-20M', label: '10 - 20 millions CFA' },
  { value: '20M+', label: 'Plus de 20 millions CFA' }
];

export const AuditBookingModal: React.FC<AuditBookingModalProps> = ({ open, onOpenChange }) => {
  const [step, setStep] = useState<'calendar' | 'form' | 'confirmation'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+229',
    isCompany: '',
    companyType: '',
    revenue: '',
    acceptTerms: false
  });

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('form');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.acceptTerms) {
      setStep('confirmation');
    }
  };

  const handleBack = () => {
    if (step === 'form') {
      setStep('calendar');
    } else if (step === 'confirmation') {
      setStep('form');
    }
  };

  const resetModal = () => {
    setStep('calendar');
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setFormData({
      name: '',
      email: '',
      phone: '+229',
      isCompany: '',
      companyType: '',
      revenue: '',
      acceptTerms: false
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetModal, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white border border-gray-200 text-gray-900">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-semibold">
              S
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                STAR LAB
              </DialogTitle>
              <h2 className="text-lg font-medium text-gray-900 mt-1">Audit Offert</h2>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-700">
            <p className="font-medium">Audit offert :</p>
            <p className="mt-1">
              Réservez votre audit stratégique pour découvrir combien d'heures par semaine vous pouvez gagner grâce à l'IA.
            </p>
          </div>
          <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>45min</span>
            </div>
            <div className="flex items-center space-x-2">
              <Video className="w-4 h-4" />
              <span>Google Meet</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Africa/Lagos</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex">
          {step === 'calendar' && (
            <>
              <div className="flex-1 p-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={fr}
                  className="bg-white border border-gray-200 rounded-lg pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </div>
              {selectedDate && (
                <div className="w-80 p-6 border-l border-gray-200">
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900">
                      {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                    </h3>
                  </div>
                  <div className="flex space-x-2 mb-4">
                    <Button variant="outline" size="sm" className="bg-white border-gray-300 text-gray-700">
                      12 h
                    </Button>
                    <Button variant="outline" size="sm" className="bg-gray-900 text-white">
                      24 h
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        className="w-full justify-start bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => handleTimeSelect(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'form' && (
            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <div className="text-sm text-gray-600">
                  {selectedDate && selectedTime && (
                    <span>
                      {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })} à {selectedTime}
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-gray-900 font-medium">
                    Nom *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-900 font-medium">
                    E-mail *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-900 font-medium">
                    Phone *
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-900 font-medium">
                    Êtes-vous une entreprise ? *
                  </Label>
                  <Select
                    value={formData.isCompany}
                    onValueChange={(value) => setFormData({ ...formData, isCompany: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Sélectionnez une option" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300">
                      <SelectItem value="oui" className="text-gray-900">Oui</SelectItem>
                      <SelectItem value="non" className="text-gray-900">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.isCompany === 'non' && (
                  <div>
                    <Label className="text-gray-900 font-medium">Si non, alors ?</Label>
                    <Select
                      value={formData.companyType}
                      onValueChange={(value) => setFormData({ ...formData, companyType: value })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue placeholder="Sélectionnez une option" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-300">
                        <SelectItem value="freelance" className="text-gray-900">Freelance</SelectItem>
                        <SelectItem value="particulier" className="text-gray-900">Particulier</SelectItem>
                        <SelectItem value="etudiant" className="text-gray-900">Étudiant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-gray-900 font-medium">
                    Quel est votre chiffre d'affaires mensuel actuel ? *
                  </Label>
                  <div className="space-y-3 mt-2">
                    {revenueRanges.map((range) => (
                      <div key={range.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={range.value}
                          checked={formData.revenue === range.value}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, revenue: range.value });
                            }
                          }}
                          className="border-gray-300"
                        />
                        <Label htmlFor={range.value} className="text-gray-900 text-sm">
                          {range.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: !!checked })}
                    className="border-gray-300 mt-1"
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                    En cochant cette case, vous vous engagez à être disponible à l'heure convenue. Notre équipe STAR LAB investit du temps et des ressources pour préparer cet audit et vous proposer des solutions sur-mesure.
                    <br />
                    <br />
                    Si vous devez reporter ce rendez-vous, merci de nous prévenir à l'avance 😊.
                  </Label>
                </div>

                <div className="text-xs text-gray-500">
                  En poursuivant, vous acceptez nos{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Conditions d'utilisation
                  </a>{' '}
                  et{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Politique de confidentialité
                  </a>.
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="bg-white border-gray-300 text-gray-700"
                  >
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gray-900 text-white hover:bg-gray-800"
                    disabled={!formData.acceptTerms}
                  >
                    Confirmer
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 'confirmation' && (
            <div className="flex-1 p-6 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  Rendez-vous confirmé !
                </h3>
                <p className="text-gray-600">
                  Votre audit offert a été programmé avec succès.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h4 className="font-semibold text-gray-900 mb-4">Détails du rendez-vous</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date :</span>
                    <span className="text-gray-900">
                      {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Heure :</span>
                    <span className="text-gray-900">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Durée :</span>
                    <span className="text-gray-900">45 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type :</span>
                    <span className="text-gray-900">Google Meet</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-6">
                Un lien Google Meet vous sera envoyé par email avant le rendez-vous.
              </div>

              <Button
                onClick={handleClose}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                Fermer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
