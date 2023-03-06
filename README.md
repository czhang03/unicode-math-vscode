# Unicode Math Input For VSCode

A fast and intuitive way to insert unicode math characters (and even Emoji 😯) using LaTeX command in any document!

# Install And Info

## From OpenVSX

[![Open VSX Version](https://img.shields.io/open-vsx/v/czhang03/unicode-math-input)](https://open-vsx.org/extension/czhang03/unicode-math-input/)
[![Open VSX Rating](https://img.shields.io/open-vsx/rating/czhang03/unicode-math-input)](https://open-vsx.org/extension/czhang03/unicode-math-input/)

## From VSCode Marketplace

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/czhang03.unicode-math-input)](https://marketplace.visualstudio.com/items?itemName=czhang03.unicode-math-input)
[![Visual Studio Marketplace Last Updated](https://img.shields.io/visual-studio-marketplace/last-updated/czhang03.unicode-math-input)](https://marketplace.visualstudio.com/items?itemName=czhang03.unicode-math-input)
[![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/czhang03.unicode-math-input)](https://marketplace.visualstudio.com/items?itemName=czhang03.unicode-math-input)

## From GitHub Release

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/czhang03/unicode-math-vscode)](https://github.com/czhang03/unicode-math-vscode/releases)
[![CodeQL](https://github.com/czhang03/unicode-math-vscode/actions/workflows/codeql.yml/badge.svg)](https://github.com/czhang03/unicode-math-vscode/actions/workflows/codeql.yml)


# Features

## Autocompletion

In any language, when you type `\`, this extension will start suggesting possible latex input. 
Autocompletion will also preview the character that you are currently typing

**NOTICE**, when [LaTeX Workshop](https://github.com/James-Yu/LaTeX-Workshop) is activated, 
the `\` trigger seems to be taken by LaTeX Workshop, 
you can set [custom trigger string](#custom-trigger-string) in the setting. 
I personally set the trigger strings as `["."]` in my LaTeX project. 


## Tab Commit

When you press tab after a LaTeX symbol, it will convert the LaTeX symbol into unicode.
The commit key can be changed by changing the keybinding for `unicode-math-input.commit`.

## Custom Trigger String

User can set custom trigger string from setting besides `\`.
they can be any strings, even `"LaTeX"`, and there can be multiple ones.
To disable this extension (typically used in LaTeX workspace),
just set the trigger strings to empty list.

## Prefix 

Currently we support the following prefixes:

| Prefix  | LaTeX Command |
| --- | --- |
| `^`  | superscript |
| `_`  | subscript |
|`b:` | bold |
|`bf:` | bold |
|`mathbf:` | bold |
|`mathbf` | bold |
|`i:` | italic |
|`it:` | italic |
|`mathit:` | italic |
|`mathit` | italic |
|`cal:` | `\mathcal` |
|`mathcal:` | `\mathcal` |
|`mathcal` | `\mathcal` |
|`frak:` | `\mathfrak` |
|`mathfrak:` | `\mathfrak` |
|`mathfrak` | `\mathfrak` |
|`Bbb:` | `\mathbb` |
|`mathbb:` | `\mathbb` |
|`mathbb` | `\mathbb` |

When you type a trigger string (like `\`) followed by prefix, then a word (without space),
the extension will commit the unicode version of that font.
For example when you type `\it:text<tab>`, `\it:text` will be changed to `𝑡𝑒𝑠𝑡`

**NOTICE**: not all math font (including super and subscript) of common characters are supported in unicode.
When the char do not have the math font, the extension will not convert anything. 

# License

This extension is licensed under LGPLv3.0,
because the license of [ibus-latex-table](https://github.com/moebiuscurve/ibus-table-others/blob/main/tables/latex.txt) is under LGPL

# Acknowledgement 

This project is a rewrite of [Fast Unicode Math Characters](https://github.com/gatapia/unicode-math-input)
by [Guido Tapia](https://github.com/gatapia). 

The mapping from latex to unicode is provided by 

- [UnicodeMath](https://github.com/mvoidex/UnicodeMath), which inspired [Fast Unicode Math Characters](https://github.com/gatapia/unicode-math-input)
- [Fast Unicode Math Characters](https://github.com/gatapia/unicode-math-input)
- [ibus-latex-table](https://github.com/moebiuscurve/ibus-table-others/blob/main/tables/latex.txt)

The icon is provided by [Material Design Icons](https://pictogrammers.com/library/mdi/icon/math-integral/), 
released under Apache2.0 license.

This project is definitely not possible without these projects.


# Roadmap

- [ ] push a warning when commit failed with prefix.
- [ ] custom symbols.
- [ ] reverse search prefix or latex command.
- [ ] automated CI documentation.
- [ ] automatically pull character from upstream.
- [ ] automatically PR to upstream.
- [ ] Screenshots/GIF on the readme.
- [ ] more tests.