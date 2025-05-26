
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, MapPin, Video, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

const revenueRanges = [
  { value: '0-10k', label: '0-10k' },
  { value: '10-20k', label: '10-20k' },
  { value: '20-50k', label: '20-50k' },
  { value: '50-100k', label: '50-100k' },
  { value: '100-200k', label: '100-200k' },
  { value: 'plus-200k', label: 'Plus de 200k' }
];

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'calendar' | 'form'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+229',
    isCompany: '',
    companyType: '',
    revenue: '',
    acceptTerms: false
  });
  const { toast } = useToast();

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('form');
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime || !formData.name || !formData.email || !formData.acceptTerms) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    console.log('Booking confirmed:', {
      date: selectedDate,
      time: selectedTime,
      ...formData
    });

    toast({
      title: "Réservation confirmée !",
      description: `Votre audit est programmé le ${format(selectedDate, 'dd MMMM yyyy', { locale: fr })} à ${selectedTime}`,
    });

    onClose();
    resetForm();
  };

  const resetForm = () => {
    setStep('calendar');
    setSelectedDate(undefined);
    setSelectedTime('');
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
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Audit Offert</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Service Info */}
          <div className="lg:w-1/3 bg-gray-50 p-6 rounded-lg">
            <div className="mb-4">
              <h3 className="font-semibold text-lg mb-2">Audit offert :</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Réservez votre audit stratégique pour découvrir combien d'heures par semaine vous pouvez gagner grâce à l'IA.
              </p>
            </div>

            {selectedDate && selectedTime && (
              <div className="mb-4 p-4 bg-white rounded-lg border">
                <div className="flex items-center mb-2">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm font-medium">
                    {format(selectedDate, 'EEEE dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center mb-2">
                  <span className="text-sm">{selectedTime} - {selectedTime.split(':')[0] === '12' ? '12:45' : `${parseInt(selectedTime.split(':')[0]) + 1}:${selectedTime.split(':')[1]}`}</span>
                </div>
                <div className="flex items-center mb-2">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm">45min</span>
                </div>
                <div className="flex items-center mb-2">
                  <Video className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm">Google Meet</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm">Africa/Lagos</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Calendar or Form */}
          <div className="lg:w-2/3">
            {step === 'calendar' ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Sélectionnez une date et heure</h3>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      className="rounded-md border pointer-events-auto"
                    />
                  </div>

                  {selectedDate && (
                    <div className="lg:w-1/3">
                      <h4 className="font-medium mb-3">Créneaux disponibles</h4>
                      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                        {timeSlots.map((time) => (
                          <Button
                            key={time}
                            variant="outline"
                            size="sm"
                            onClick={() => handleTimeSelect(time)}
                            className="justify-center"
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('calendar')}
                    className="mr-3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Retour
                  </Button>
                  <h3 className="font-semibold text-lg">Vos informations</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Votre nom complet"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+229"
                    />
                  </div>

                  <div>
                    <Label htmlFor="isCompany">Êtes-vous une entreprise ? *</Label>
                    <Select
                      value={formData.isCompany}
                      onValueChange={(value) => handleInputChange('isCompany', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oui">Oui</SelectItem>
                        <SelectItem value="non">Non</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.isCompany === 'non' && (
                    <div>
                      <Label htmlFor="companyType">Si non, alors ?</Label>
                      <Select
                        value={formData.companyType}
                        onValueChange={(value) => handleInputChange('companyType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freelance">Freelance</SelectItem>
                          <SelectItem value="etudiant">Étudiant</SelectItem>
                          <SelectItem value="particulier">Particulier</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Quel est votre chiffre d'affaires mensuel actuel ? *</Label>
                    <div className="space-y-2 mt-2">
                      {revenueRanges.map((range) => (
                        <div key={range.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={range.value}
                            checked={formData.revenue === range.value}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleInputChange('revenue', range.value);
                              }
                            }}
                          />
                          <Label htmlFor={range.value} className="text-sm">
                            {range.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id="commitment"
                        checked={true}
                        disabled
                      />
                      <Label htmlFor="commitment" className="text-sm">
                        En cochant cette case, vous vous engagez à être disponible à l'heure convenue. Notre équipe Automascale investit du temps et des ressources pour préparer cet audit et vous proposer des solutions sur-mesure.
                      </Label>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Si vous devez reporter ce rendez-vous, merci de nous prévenir à l'avance 😊.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      En poursuivant, vous acceptez nos{' '}
                      <span className="text-blue-600 underline cursor-pointer">Conditions d'utilisation</span> et{' '}
                      <span className="text-blue-600 underline cursor-pointer">Politique de confidentialité</span>.
                    </Label>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep('calendar')}>
                      Retour
                    </Button>
                    <Button onClick={handleConfirm} className="bg-gray-800 hover:bg-gray-900">
                      Confirmer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
