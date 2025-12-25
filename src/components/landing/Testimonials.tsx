"use client";

import { Card, CardContent } from "@/components/ui";

interface Testimonial {
  name: string;
  text: string;
  rating: number;
}

interface TestimonialsProps {
  title: string;
  testimonials: Testimonial[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < rating ? "text-amber-400" : "text-slate-600"}
        >
          &#9733;
        </span>
      ))}
    </div>
  );
}

export function Testimonials({ title, testimonials }: TestimonialsProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-12">
        <span className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          {title}
        </span>
      </h2>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <Card key={index} variant="interactive" className="h-full">
            <CardContent className="p-6 flex flex-col h-full">
              {/* Avatar placeholder */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-100">
                    {testimonial.name}
                  </p>
                  <StarRating rating={testimonial.rating} />
                </div>
              </div>

              {/* Quote */}
              <p className="text-slate-400 italic flex-1">
                &ldquo;{testimonial.text}&rdquo;
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
