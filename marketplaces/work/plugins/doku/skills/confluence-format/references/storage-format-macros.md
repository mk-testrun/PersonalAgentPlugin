# Confluence Storage-Format Macros

## Panels (hints)
```xml
<ac:structured-macro ac:name="info">
  <ac:rich-text-body><p>Short note for readers.</p></ac:rich-text-body>
</ac:structured-macro>
```
`ac:name` ∈ `info` (blue) · `note` (grey) · `tip`/`success` (green) · `warning` (red).

## Code block (always set language)
```xml
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">csharp</ac:parameter>
  <ac:parameter ac:name="title">Program.cs</ac:parameter>
  <ac:plain-text-body><![CDATA[
public static void Main() => Console.WriteLine("Hi");
  ]]></ac:plain-text-body>
</ac:structured-macro>
```

## Table of contents
```xml
<ac:structured-macro ac:name="toc"/>
```

## Expand (collapsible)
```xml
<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Details</ac:parameter>
  <ac:rich-text-body><p>…</p></ac:rich-text-body>
</ac:structured-macro>
```

## Status lozenge
```xml
<ac:structured-macro ac:name="status">
  <ac:parameter ac:name="colour">Green</ac:parameter>
  <ac:parameter ac:name="title">ACCEPTED</ac:parameter>
</ac:structured-macro>
```
Colours: `Grey` (Proposed) · `Green` (Accepted) · `Red` (Deprecated) · `Yellow` (In Review).

## Tables & layout
Use real `<table><tbody><tr><th>/<td>`; for side-by-side, the `ac:layout` / `layout-section` macros.

## Image / attachment
```xml
<ac:image><ri:attachment ri:filename="diagram.png"/></ac:image>
```
Upload the file as a page attachment first, then reference it by filename.
