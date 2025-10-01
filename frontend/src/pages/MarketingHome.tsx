import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Check, Mic, ChevronRight, Users, Star, MinusCircle, PlusCircle, X, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";
const MarketingHome = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return <div className="min-h-screen bg-background text-foreground font-manrope">
      {/* Navigation */}
      <nav className="relative z-50 px-4 md:px-8 py-6 md:py-[62px]">
        <div className="max-w-6xl mx-auto flex md:grid md:grid-cols-3 items-center justify-between">
          <div className="text-xl font-thin tracking-wide text-foreground">
            KLARIQO
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center justify-center space-x-2 bg-card rounded-full p-1">
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors font-normal text-sm tracking-wide px-4 py-2 rounded-full hover:bg-accent">Pricing</a>
            <a href="#enterprise" className="text-muted-foreground hover:text-foreground transition-colors font-normal text-sm tracking-wide px-4 py-2 rounded-full hover:bg-accent">Enterprise</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors font-normal text-sm tracking-wide px-4 py-2 rounded-full hover:bg-accent">Contact Us</a>
          </div>
          
          {/* Desktop Right Actions */}
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
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="text-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Fullscreen Menu */}
        {mobileMenuOpen && <div className="fixed inset-0 z-50 bg-background md:hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between p-4">
                <div className="text-xl font-thin tracking-wide text-foreground">
                  KLARIQO
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="text-foreground">
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center space-y-8 px-6">
                <a href="#pricing" className="text-2xl font-normal text-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Pricing
                </a>
                <a href="#enterprise" className="text-2xl font-normal text-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Enterprise
                </a>
                <a href="#contact" className="text-2xl font-normal text-foreground hover:text-primary transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Contact Us
                </a>
                
                <div className="pt-8 space-y-4 w-full max-w-xs">
                  <Button variant="ghost" className="w-full text-lg font-normal" onClick={() => setMobileMenuOpen(false)}>
                    Login
                  </Button>
                  <Button className="w-full text-lg font-normal bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          </div>}
      </nav>

      {/* Demo Button Section */}
      <section className="flex justify-center px-[12px] py-[10px]">
        <div className="relative group py-[10px] px-[10px]">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full animate-gradient-x opacity-75 blur-xl animate-pulse-glow"></div>
          <button className="relative w-40 h-40 bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary text-white rounded-full transition-all duration-300 hover:scale-105 shadow-2xl flex items-center justify-center py-0 px-0">
            <div className="relative">
              <Mic className="w-10 h-10 text-white" />
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
            </div>
          </button>
        </div>
      </section>

      {/* Hero Section */}
      <section className="px-4 md:px-8 py-8 md:py-16 lg:py-[16px]">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-thin mb-6 md:mb-8 leading-[1.1] tracking-tight">
            AI phone agent that{' '}
            <span className="text-primary">never sleeps</span>
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-8 md:mb-16 max-w-2xl mx-auto leading-relaxed font-thin">
            Answer every call, book every appointment, capture every lead. 
            24/7 automated phone handling for your business.
          </p>

          <div className="flex flex-col items-center mb-12 md:mb-24">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-normal text-lg md:text-xl border-0 mb-4 md:py-8 px-8 md:px-14 py-[32px]">
              <Phone className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
              Get Started for Free
            </Button>
            <p className="text-sm text-muted-foreground font-normal">3 Day Free Trial • 10 calls included • No Credit Card Required</p>
          </div>

          {/* Simple Stats */}
          <div className="grid grid-cols-3 gap-8 md:gap-16 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-thin text-primary mb-2">95%</div>
              <div className="text-xs md:text-sm text-muted-foreground font-normal">Answer Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-thin text-primary mb-2">24/7</div>
              <div className="text-xs md:text-sm text-muted-foreground font-normal">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-thin text-primary mb-2">2min</div>
              <div className="text-xs md:text-sm text-muted-foreground font-normal">Setup</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 md:px-8 py-12 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-thin mb-4 md:mb-8 leading-tight">
              Never miss another call
            </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-thin leading-relaxed">
            Your AI receptionist handles everything while you focus on your business
          </p>
          </div>

          <div className="space-y-16 md:space-y-24">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-16 items-center">
              <div>
                <h3 className="text-2xl md:text-3xl font-thin mb-4 md:mb-6 leading-tight">
                  Instant call pickup
                </h3>
                <p className="text-base md:text-lg text-muted-foreground font-thin leading-relaxed mb-6 md:mb-8">
                  No more missed opportunities. Every call is answered within seconds, 
                  professionally and consistently.
                </p>
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center text-foreground">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-primary mr-3 md:mr-4 flex-shrink-0" />
                    <span className="font-normal text-sm md:text-base">Professional greeting every time</span>
                  </div>
                  <div className="flex items-center text-foreground">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-primary mr-3 md:mr-4 flex-shrink-0" />
                    <span className="font-normal text-sm md:text-base">Captures customer details</span>
                  </div>
                  <div className="flex items-center text-foreground">
                    <Check className="w-4 h-4 md:w-5 md:h-5 text-primary mr-3 md:mr-4 flex-shrink-0" />
                    <span className="font-normal text-sm md:text-base">Books appointments automatically</span>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-3xl p-6 md:p-12 text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8">
                  <Phone className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                </div>
                <div className="text-sm text-muted-foreground font-normal mb-2">Average Response Time</div>
                <div className="text-3xl md:text-4xl font-thin text-primary">0.8 seconds</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="lg:order-2">
                <h3 className="text-3xl font-thin mb-6 leading-tight">
                  24/7 availability
                </h3>
                <p className="text-lg text-muted-foreground font-thin leading-relaxed mb-8">
                  While your competitors close at 5pm, your AI works around the clock. 
                  Capture leads from different time zones and emergency calls.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center text-foreground">
                    <Check className="w-5 h-5 text-primary mr-4" />
                    <span className="font-normal">Never takes breaks or sick days</span>
                  </div>
                  <div className="flex items-center text-foreground">
                    <Check className="w-5 h-5 text-primary mr-4" />
                    <span className="font-normal">Handles multiple calls simultaneously</span>
                  </div>
                  <div className="flex items-center text-foreground">
                    <Check className="w-5 h-5 text-primary mr-4" />
                    <span className="font-normal">Emergency and after-hours support</span>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-3xl p-12 text-center lg:order-1">
                <div className="text-sm text-muted-foreground font-normal mb-4">Business Hours</div>
                <div className="text-2xl font-thin text-primary mb-8">Always Open</div>
                <div className="grid grid-cols-7 gap-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <div key={i} className="text-center">
                      <div className="text-xs text-muted-foreground font-normal mb-2">{day}</div>
                      <div className="w-2 h-8 bg-primary rounded-full mx-auto"></div>
                    </div>)}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h3 className="text-3xl font-thin mb-6 leading-tight">
                  Massive cost savings
                </h3>
                <p className="text-lg text-muted-foreground font-thin leading-relaxed mb-8">
                  Replace expensive receptionist salaries with AI that costs less than 
                  a daily coffee budget and never asks for a raise.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center text-foreground">
                    <Check className="w-5 h-5 text-primary mr-4" />
                    <span className="font-normal">90% cheaper than human staff</span>
                  </div>
                  <div className="flex items-center text-foreground">
                    <Check className="w-5 h-5 text-primary mr-4" />
                    <span className="font-normal">No hiring or training costs</span>
                  </div>
                  <div className="flex items-center text-foreground">
                    <Check className="w-5 h-5 text-primary mr-4" />
                    <span className="font-normal">Predictable monthly pricing</span>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-3xl p-12">
                <div className="text-sm text-muted-foreground font-normal mb-4 text-center">Monthly Comparison</div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-normal">Human Receptionist</span>
                    <span className="text-destructive font-normal">$3,200</span>
                  </div>
                  <div className="h-px bg-border"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-normal">Klariqo AI</span>
                    <span className="text-primary font-normal">$299</span>
                  </div>
                  <div className="text-center pt-4">
                    <div className="text-sm text-muted-foreground font-normal">You save</div>
                    <div className="text-2xl font-thin text-green-400">$2,901/month</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 md:px-8 py-12 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-thin mb-4 md:mb-8 leading-tight">
              How it works?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground font-thin leading-relaxed">
              Get started in minutes with our simple setup process
            </p>
          </div>

          <div className="relative">
            <div className="grid lg:grid-cols-3 gap-8 md:gap-16 relative">
              <div className="text-center relative">
                <div className="relative mb-6 md:mb-8">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 bg-background border-4 border-primary">
                    <span className="text-lg md:text-2xl font-normal text-primary">1</span>
                  </div>
                  {/* Connector line to next step */}
                  <div className="absolute top-6 md:top-8 left-1/2 w-full h-px bg-border transform translate-x-8 hidden lg:block"></div>
                </div>
                <h3 className="text-xl md:text-2xl font-thin mb-3 md:mb-4">Connect Your Phone</h3>
                <p className="text-sm md:text-base text-muted-foreground font-normal leading-relaxed">
                  Forward your business number to our AI system. Takes less than 30 seconds to set up.
                </p>
              </div>

              <div className="text-center relative">
                <div className="relative mb-6 md:mb-8">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 bg-background border-4 border-primary">
                    <span className="text-lg md:text-2xl font-normal text-primary">2</span>
                  </div>
                  {/* Connector line to next step */}
                  <div className="absolute top-6 md:top-8 left-1/2 w-full h-px bg-border transform translate-x-8 hidden lg:block"></div>
                </div>
                <h3 className="text-xl md:text-2xl font-thin mb-3 md:mb-4">Train Your AI</h3>
                <p className="text-sm md:text-base text-muted-foreground font-normal leading-relaxed">
                  Tell us about your business, services, and how you want calls handled. AI learns instantly.
                </p>
              </div>

              <div className="text-center">
                <div className="relative mb-6 md:mb-8">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 bg-background border-4 border-primary">
                    <span className="text-lg md:text-2xl font-normal text-primary">3</span>
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-thin mb-3 md:mb-4">Start Receiving Calls</h3>
                <p className="text-sm md:text-base text-muted-foreground font-normal leading-relaxed">
                  Your AI agent is live! Every call gets answered professionally, 24/7.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="px-8 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-thin mb-8 leading-tight">
              Human Agent vs Klariqo AI
            </h2>
            <p className="text-xl text-muted-foreground font-thin leading-relaxed">
              See why businesses are switching to AI phone agents
            </p>
          </div>

          <div className="bg-gradient-to-br from-card to-card/80 rounded-3xl overflow-hidden shadow-2xl border border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-muted/30 to-muted/10">
                  <tr>
                    <th className="text-left py-8 px-8 font-normal text-foreground text-lg">Feature</th>
                    <th className="text-center py-8 px-8 font-normal text-muted-foreground text-lg">Human Agent</th>
                    <th className="text-center py-8 px-8 font-normal text-primary text-lg bg-primary/5">Klariqo AI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="py-6 px-8 font-normal text-foreground">Availability</td>
                    <td className="text-center py-6 px-8 font-normal text-muted-foreground">8-10 hours/day</td>
                    <td className="text-center py-6 px-8 font-normal text-primary bg-primary/5">
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        24/7/365
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="py-6 px-8 font-normal text-foreground">Response Time</td>
                    <td className="text-center py-6 px-8 font-normal text-muted-foreground">3-5 seconds</td>
                    <td className="text-center py-6 px-8 font-normal text-primary bg-primary/5">
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        0.8 seconds
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="py-6 px-8 font-normal text-foreground">Monthly Cost</td>
                    <td className="text-center py-6 px-8 font-normal text-destructive">$3,200+</td>
                    <td className="text-center py-6 px-8 font-normal text-primary bg-primary/5">
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        $299
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="py-6 px-8 font-normal text-foreground">Sick Days</td>
                    <td className="text-center py-6 px-8 font-normal text-destructive">
                      <div className="flex items-center justify-center gap-2">
                        <X className="w-4 h-4 text-destructive" />
                        Yes
                      </div>
                    </td>
                    <td className="text-center py-6 px-8 font-normal text-primary bg-primary/5">
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        Never
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                    <td className="py-6 px-8 font-normal text-foreground">Training Time</td>
                    <td className="text-center py-6 px-8 font-normal text-muted-foreground">2-4 weeks</td>
                    <td className="text-center py-6 px-8 font-normal text-primary bg-primary/5">
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        2 minutes
                      </div>
                    </td>
                  </tr>
                  <tr className="hover:bg-accent/20 transition-colors">
                    <td className="py-6 px-8 font-normal text-foreground">Consistency</td>
                    <td className="text-center py-6 px-8 font-normal text-muted-foreground">Variable</td>
                    <td className="text-center py-6 px-8 font-normal text-primary bg-primary/5">
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        Perfect
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-8 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-thin mb-8 leading-tight">
              What our customers say
            </h2>
            <p className="text-xl text-muted-foreground font-thin leading-relaxed">
              Real businesses, real results
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-card rounded-3xl p-8">
              <div className="flex mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />)}
              </div>
              <p className="text-muted-foreground font-normal leading-relaxed mb-6">
                "Our call answer rate went from 60% to 100%. We haven't missed a single lead since switching to Klariqo."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-normal text-foreground">Sarah Johnson</div>
                  <div className="text-sm text-muted-foreground font-normal">CEO, MedCare Clinic</div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-3xl p-8">
              <div className="flex mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />)}
              </div>
              <p className="text-muted-foreground font-normal leading-relaxed mb-6">
                "Saved us $40,000 annually while improving our customer service. Best business decision we've made."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-normal text-foreground">Mike Chen</div>
                  <div className="text-sm text-muted-foreground font-normal">Owner, Chen's Law Firm</div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-3xl p-8">
              <div className="flex mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />)}
              </div>
              <p className="text-muted-foreground font-normal leading-relaxed mb-6">
                "Setup was incredibly easy. Our AI agent handles appointments perfectly and our patients love it."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-normal text-foreground">Dr. Emily Rodriguez</div>
                  <div className="text-sm text-muted-foreground font-normal">Rodriguez Dental</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-8 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-6xl font-thin mb-8 leading-tight">
              Frequently asked questions
            </h2>
            <p className="text-xl text-muted-foreground font-thin leading-relaxed">
              Everything you need to know about Klariqo
            </p>
          </div>

          <div className="space-y-4">
            {[{
            question: "How quickly can I set up Klariqo?",
            answer: "Setup takes less than 2 minutes. Simply forward your phone number, tell us about your business, and your AI agent is ready to take calls."
          }, {
            question: "What happens to calls during busy periods?",
            answer: "Klariqo can handle unlimited simultaneous calls. Unlike human agents, there's no busy signal or wait time - every caller gets immediate attention."
          }, {
            question: "Can the AI handle complex customer inquiries?",
            answer: "Yes! Klariqo is trained on your specific business information and can handle appointments, basic inquiries, and lead capture. For complex issues, it can seamlessly transfer to a human agent."
          }, {
            question: "Is there a contract or can I cancel anytime?",
            answer: "No contracts required. You can cancel your subscription at any time. We also offer a 30-day money-back guarantee."
          }, {
            question: "How does pricing work?",
            answer: "Simple monthly subscription starting at $299/month. This includes unlimited calls, 24/7 support, and all features. No hidden fees or per-call charges."
          }].map((faq, index) => <div key={index} className="bg-card rounded-2xl">
                <button className="w-full p-6 text-left flex items-center justify-between hover:bg-accent/50 transition-colors rounded-2xl" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                  <span className="font-normal text-foreground pr-4">{faq.question}</span>
                  {openFaq === index ? <MinusCircle className="w-5 h-5 text-primary flex-shrink-0" /> : <PlusCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                </button>
                {openFaq === index && <div className="px-6 pb-6">
                    <p className="text-muted-foreground font-normal leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>}
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-8 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl lg:text-7xl font-thin mb-8 leading-tight">
            Ready to get started?
          </h2>
          <p className="text-xl text-muted-foreground mb-12 font-thin leading-relaxed">
            Join hundreds of businesses that never miss a call. 
            Set up your AI phone agent in under 2 minutes.
          </p>
          
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-normal text-xl border-0 mb-8 px-[56px] py-[32px]">
            <Phone className="w-6 h-6 mr-3" />
            Start Free Trial
          </Button>

          <div className="text-sm text-muted-foreground font-normal">3 Day Free Trial • 10 calls included • No Credit Card Required</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-xl font-thin tracking-wide text-foreground mb-4 md:mb-0">
              KLARIQO
            </div>
            <div className="flex space-x-8 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors font-normal text-sm">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors font-normal text-sm">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors font-normal text-sm">Contact</a>
            </div>
          </div>
          <div className="text-center text-muted-foreground text-xs mt-8 font-normal">
            © 2024 Klariqo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>;
};
export default MarketingHome;