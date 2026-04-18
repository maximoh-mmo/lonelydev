# LonelyDev Website Style Guide

This document outlines the standard styling classes used across the website to ensure consistency.

## Layout Containers
All page content should be wrapped in a standard container to ensure consistent width and padding.

```jsx
<main className="max-w-4xl mx-auto px-6 py-16 text-left">
  {/* Content */}
</main>
```
*Note: `text-left` is standard for body content. Headers may be centered.*

## Typography

### Page Titles (H1)
Always centered, bold, and distinct.
```jsx
<h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-10 text-center">
  Page Title
</h1>
```

### Section Headings (H2)
Left-aligned (usually), bold, with spacing.
```jsx
<h2 className="text-2xl font-semibold text-gray-900 mb-4">
  Section Title
</h2>
```

### Body Text
Large, readable text with relaxed line height.
```jsx
<p className="text-lg text-gray-700 mb-8 leading-relaxed">
  Your paragraph text here...
</p>
```
*For introductory paragraphs, you may use `text-center` or italics if appropriate.*

### Links
Standard text links within paragraphs should use the stylized blue style. For consistency, use the `<TextLink />` component.

```jsx
<TextLink to="/target">
  Link Text
</TextLink>
```

**Styling Classes:**
`inline-block text-blue-700 hover:text-blue-900 font-bold border-b-2 border-transparent hover:border-blue-700 transition-all duration-300 hover:scale-[1.02]`

## Images & Media
Images should pop off the page slightly with a shadow and subtle zoom effect on hover.

### Standard Image
```jsx
<img 
  src="/path/to/image.jpg" 
  alt="Description" 
  className="rounded-xl shadow-md mx-auto transform transition-transform duration-300 hover:scale-105" 
/>
```

### Captions
Subtle, centered text below the image.
```jsx
<figcaption className="text-sm text-gray-500 mt-2 text-center">
  Image description
</figcaption>
```

## Code & Monospace

### Inline Code
Single backticks in markdown (e.g. `ILabyrinthConstraint`) render as inline code with a classic console look:
```jsx
<span className="text-green-400 font-mono text-base bg-gray-900 px-1.5 py-0.5 rounded">
  CodeName
</span>
```

### Code Blocks
Multi-line code (triple backticks) renders with a dark background and green text:
```jsx
<div className="my-8 relative group">
  <pre className="bg-gray-900 text-green-400 rounded-xl p-6 font-mono text-sm overflow-x-auto border border-green-900/30 shadow-lg">
    <code>
      // code here
    </code>
  </pre>
</div>
```

## Blog Post Structure
Standard structure for a blog post or project detail:

1.  **Header**: H1 (Centered).
2.  **Meta**: Date/Category (Centered, Gray).
3.  **Intro**: Lead paragraph.
4.  **Content**: Sections with H2s and Body Text.
5.  **Media**: Interspersed images with captions.
