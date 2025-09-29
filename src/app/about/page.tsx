
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaBullseye, FaFlagCheckered, FaUsers, FaLaptopCode, FaCloud, FaRobot, FaChartLine, FaShieldAlt } from 'react-icons/fa';

const coreValues = [
    { title: 'Innovation First', icon: <FaRobot /> },
    { title: 'Customer-Centric Approach', icon: <FaUsers /> },
    { title: 'Transparency & Integrity', icon: <FaFlagCheckered /> },
    { title: 'Continuous Learning', icon: <FaLaptopCode /> },
    { title: 'Quality over Quantity', icon: <FaBullseye /> },
];

const services = [
    { title: 'Web Development', description: 'Modern, scalable, and user-friendly websites & apps.', icon: <FaLaptopCode /> },
    { title: 'Cloud Solutions', description: 'Secure hosting, deployment, and data management.', icon: <FaCloud /> },
    { title: 'AI & Automation', description: 'Smart workflows, chatbots, and predictive systems.', icon: <FaRobot /> },
    { title: 'CRM & ERP Development', description: 'Streamlined solutions for business operations.', icon: <FaChartLine /> },
    { title: 'Cybersecurity', description: 'Protecting businesses with the latest security practices.', icon: <FaShieldAlt /> },
];

const highlights = [
    { value: '100+', label: 'Projects Delivered' },
    { value: '50+', label: 'Happy Clients Worldwide' },
    { value: '24/7', label: 'Support Team' },
];

export default function AboutPage() {
    const aboutUsImage = PlaceHolderImages.find(p => p.id === 'about-us-hero');

    return (
        <div className="bg-background text-foreground">
            <header className="relative h-[50vh] min-h-[400px] flex items-center justify-center text-center text-white">
                <div className="absolute inset-0">
                    {aboutUsImage && (
                        <Image
                            src={aboutUsImage.imageUrl}
                            alt={aboutUsImage.description}
                            fill
                            className="brightness-50 object-cover"
                            data-ai-hint={aboutUsImage.imageHint}
                        />
                    )}
                </div>
                <div className="relative z-10 p-4">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight">🚀 TechSavvy Solutions</h1>
                    <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto">
                        Innovative Digital Products & Enterprise-Grade Software Solutions
                    </p>
                </div>
            </header>

            <main className="container mx-auto px-4 py-16 md:py-24 space-y-20">
                <section id="about-us">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-semibold mb-4 tracking-tight">About Us</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                TechSavvy Solutions is a modern IT services company delivering innovative digital products and enterprise-grade software solutions. We help businesses grow through cutting-edge technologies like cloud computing, AI-driven automation, and secure web applications. Our goal is simple: to empower companies with reliable, scalable, and future-ready solutions.
                            </p>
                        </div>
                         <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 text-primary pt-1"><FaBullseye size={24} /></div>
                                <div>
                                    <h3 className="font-semibold text-lg">Mission</h3>
                                    <p className="text-muted-foreground mt-1">Deliver high-quality IT solutions with transparency and trust, simplify technology for all business sizes, and create long-term partnerships through innovation and customer success.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 text-primary pt-1"><FaFlagCheckered size={24} /></div>
                                <div>
                                    <h3 className="font-semibold text-lg">Vision</h3>
                                    <p className="text-muted-foreground mt-1">To become a global technology leader, empowering businesses to adapt and thrive in the digital era.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="core-values">
                    <h2 className="text-3xl font-semibold text-center mb-10 tracking-tight">Our Core Values</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
                        {coreValues.map((value) => (
                            <Card key={value.title} className="p-6 flex flex-col items-center justify-center hover:shadow-lg transition-shadow">
                                <div className="text-primary text-4xl mb-4">{value.icon}</div>
                                <h3 className="font-semibold">{value.title}</h3>
                            </Card>
                        ))}
                    </div>
                </section>

                <section id="services">
                    <h2 className="text-3xl font-semibold text-center mb-10 tracking-tight">Our Services</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((service) => (
                            <Card key={service.title} className="hover:border-primary transition-colors">
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <div className="text-primary text-3xl">{service.icon}</div>
                                    <CardTitle>{service.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{service.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <section id="highlights" className="bg-muted -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-16">
                     <div className="container mx-auto">
                        <h2 className="text-3xl font-semibold text-center mb-10 tracking-tight">Company Highlights</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                            {highlights.map((highlight) => (
                                <div key={highlight.label}>
                                    <p className="text-5xl font-bold text-primary">{highlight.value}</p>
                                    <p className="mt-2 text-muted-foreground">{highlight.label}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-center text-muted-foreground mt-8">Offices in India, USA & Remote Presence Globally</p>
                    </div>
                </section>
                
                 <section id="contact-us" className="text-center max-w-2xl mx-auto">
                    <h2 className="text-3xl font-semibold mb-6 tracking-tight">Contact Us</h2>
                    <div className="flex flex-col sm:flex-row justify-center gap-8 text-muted-foreground">
                        <div>
                            <strong>📍 Location:</strong> Chennai, India
                        </div>
                        <div>
                            <strong>📧 Email:</strong> <a href="mailto:contact@techsavvysolutions.com" className="text-primary hover:underline">contact@techsavvysolutions.com</a>
                        </div>
                        <div>
                             <strong>🌍 Website:</strong> <a href="http://www.techsavvysolutions.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.techsavvysolutions.com</a>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
}
