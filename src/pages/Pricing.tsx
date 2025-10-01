import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Check, Menu, X } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ThemeToggle } from '@/components/ThemeToggle';
interface PricingData {
  currency: string;
  symbol: string;
  basePrice: number;
  perCallPrice: number;
}
const Pricing = () => {
  const [calls, setCalls] = useState([100]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pricingData, setPricingData] = useState<PricingData>({
    currency: 'USD',
    symbol: '$',
    basePrice: 49,
    perCallPrice: 2
  });
  useEffect(() => {
    // Detect user's location for currency
    const detectCurrency = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_code === 'AU') {
          setPricingData({
            currency: 'AUD',
            symbol: '$',
            basePrice: 67,
            perCallPrice: 3
          });
        }
      } catch (error) {
        console.log('Using default USD pricing');
      }
    };
    detectCurrency();
  }, []);
  const calculatePrice = (numCalls: number) => {
    if (numCalls <= 20) {
      return pricingData.basePrice;
    }
    return pricingData.basePrice + (numCalls - 20) * pricingData.perCallPrice;
  };
  const currentPrice = calculatePrice(calls[0]);
  const pricePerCall = calls[0] <= 20 ? (pricingData.basePrice / 20).toFixed(2) : pricingData.perCallPrice.toFixed(2);
  const features = ['No setup fees or hidden costs', 'Cancel anytime - no long-term contracts', '7-day free trial with full access', 'Australian-based support team', 'GDPR & privacy compliant', 'Easy integration with existing systems', '24/7 AI phone assistant', 'Advanced appointment scheduling', 'Intelligent lead qualification', 'SMS & email notifications', 'Detailed analytics & reporting', 'Custom business greetings'];
  const faqs = [{
    question: 'How does the free trial work?',
    answer: 'Start with a 7-day free trial that includes access to all features. No credit card required to begin, and you can cancel anytime during the trial period.'
  }, {
    question: 'What happens if I exceed my call limit?',
    answer: `If you exceed your monthly call limit, additional calls are charged at ${pricingData.symbol}${pricingData.perCallPrice} per call. You can upgrade your plan at any time to avoid overage charges.`
  }, {
    question: 'Can I change my call limit later?',
    answer: 'Yes! You can adjust your monthly call limit at any time. Changes take effect at the start of your next billing cycle.'
  }, {
    question: 'Is there a setup fee?',
    answer: 'No setup fees ever. Your subscription includes everything needed to get started, including onboarding support and AI training.'
  }, {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer a 30-day money-back guarantee. If you\'re not completely satisfied, we\'ll refund your first month\'s payment.'
  }, {
    question: 'Can the AI handle my specific industry?',
    answer: 'Absolutely! Our AI is trained on industry-specific knowledge and can be customized for your business type, from healthcare to home services.'
  }];
  return <div className="min-h-screen bg-background text-foreground font-manrope">
      {/* Navigation */}
      <nav className="relative z-50 px-4 md:px-8 py-4 md:py-[52px]">
        <div className="max-w-6xl mx-auto flex md:grid md:grid-cols-3 items-center justify-between">
          <a href="/" className="text-xl font-thin tracking-wide text-foreground hover:text-primary transition-colors">
            KLARIQO
          </a>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center justify-center space-x-2 bg-card rounded-full p-1">
            <a href="/pricing" className="text-primary bg-primary/10 transition-colors font-normal text-sm tracking-wide px-4 py-2 rounded-full">Pricing</a>
            <a href="#enterprise" className="text-muted-foreground hover:text-foreground transition-colors font-normal text-sm tracking-wide px-4 py-2 rounded-full hover:bg-accent">Enterprise</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors font-normal text-sm tracking-wide px-4 py-2 rounded-full hover:bg-accent">Contact Us</a>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center justify-end space-x-4">
            <ThemeToggle />
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-normal px-4 py-2 text-sm">
              Login
            </Button>
            <Button className="bg-primary hover:bg-primary/90 border-0 text-primary-foreground font-normal text-sm my-0 py-[2px] px-[36px]">
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(true)} className="text-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm md:hidden">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <div className="text-xl font-thin tracking-wide text-foreground">
                KLARIQO
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)} className="text-foreground">
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 flex flex-col justify-center space-y-8 px-8">
              <a href="/pricing" className="text-2xl font-light text-primary text-center py-4" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </a>
              <a href="#enterprise" className="text-2xl font-light text-foreground text-center py-4 hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Enterprise
              </a>
              <a href="#contact" className="text-2xl font-light text-foreground text-center py-4 hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Contact Us
              </a>
              
              <div className="space-y-4 pt-8">
                <Button variant="ghost" className="w-full text-lg font-light text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Button>
                <Button className="w-full text-lg font-light bg-primary hover:bg-primary/90 border-0 text-primary-foreground" onClick={() => setMobileMenuOpen(false)}>
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>}

      {/* Hero Section */}
      <section className="px-4 md:px-8 md:py-16 text-center py-[18px]">
        <div className="max-w-4xl mx-auto">
          <h1 className="md:text-6xl font-thin text-foreground mb-4 md:mb-6 tracking-tight leading-tight text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 font-light">
            Pay only for what you use. All prices in {pricingData.currency}.
          </p>
          
        </div>
      </section>

      {/* Pricing Calculator */}
      <section className="px-4 md:px-8 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="border-primary shadow-lg">
            <CardHeader className="text-center pb-4 md:pb-8">
              <CardTitle className="text-2xl md:text-3xl font-light mb-2 md:mb-4">
                How many calls do you need per month?
              </CardTitle>
              <CardDescription className="text-base md:text-lg">
                Adjust the slider to see your custom pricing
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 md:space-y-8">
              {/* Calls Display - Now Above Slider */}
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-thin text-foreground mb-2">
                  {calls[0]} calls
                </div>
                <div className="text-sm md:text-base text-muted-foreground">
                  per month
                </div>
              </div>

              {/* Slider */}
              <div className="px-2 md:px-4">
                <Slider value={calls} onValueChange={setCalls} max={2000} min={20} step={10} className="w-full" />
              </div>
              
              {/* Price Display - Reduced Size */}
              <div className="text-center space-y-3 md:space-y-4">
                <div className="text-3xl md:text-4xl font-thin text-foreground">
                  {pricingData.symbol}{currentPrice}
                  <span className="text-lg md:text-xl text-muted-foreground font-normal">/month</span>
                </div>
                <div className="text-sm md:text-base text-muted-foreground">
                  {pricingData.symbol}{pricePerCall} per call
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="bg-card/50 rounded-lg p-4 md:p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Base package (20 calls)</span>
                  <span>{pricingData.symbol}{pricingData.basePrice}</span>
                </div>
                {calls[0] > 20 && <div className="flex justify-between text-sm">
                    <span>Additional calls ({calls[0] - 20} × {pricingData.symbol}{pricingData.perCallPrice})</span>
                    <span>{pricingData.symbol}{(calls[0] - 20) * pricingData.perCallPrice}</span>
                  </div>}
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total Monthly Cost</span>
                    <span>{pricingData.symbol}{currentPrice}/month</span>
                  </div>
                </div>
              </div>

              <Button size="lg" className="w-full">
                Start Your Free Trial
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 md:px-8 py-8 md:py-16 bg-card/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-light text-foreground mb-8 md:mb-12">
            Everything You Need to Get Started
          </h2>
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {features.map((feature, index) => <div key={index} className="flex items-center space-x-3 text-left">
                <Check className="w-4 md:w-5 h-4 md:h-5 text-primary flex-shrink-0" />
                <span className="text-sm md:text-base text-muted-foreground">{feature}</span>
              </div>)}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 md:px-8 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-foreground text-center mb-8 md:mb-12">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => <AccordionItem key={index} value={`item-${index}`} className="border border-border rounded-lg px-4 md:px-6">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="font-medium md:font-normal text-foreground text-sm md:text-base">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 text-sm md:text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>)}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 md:px-8 py-8 md:py-16 text-center bg-card/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-foreground mb-4 md:mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-6 md:mb-8">
            Join hundreds of businesses already using Klariqo to automate their phone operations.
          </p>
          <Button size="lg" className="px-6 md:px-8">
            Start Your Free Trial Today
          </Button>
          <div className="text-sm text-muted-foreground mt-4">
            No credit card required • Setup in under 5 minutes
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 md:px-8 py-8 md:py-12 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-xl font-thin tracking-wide text-foreground mb-4 md:mb-0">
              KLARIQO
            </div>
            <div className="flex space-x-6 md:space-x-8 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors font-normal text-sm">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors font-normal text-sm">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors font-normal text-sm">Contact</a>
            </div>
          </div>
          <div className="text-center text-muted-foreground text-xs mt-6 md:mt-8 font-normal">
            © 2024 Klariqo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>;
};
export default Pricing;