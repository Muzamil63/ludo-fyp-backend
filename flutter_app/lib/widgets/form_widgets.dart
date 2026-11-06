// Form pieces: a labelled text field and a row of selectable chips (OptionPicker).
import 'package:flutter/material.dart';
import '../theme.dart';

class AppTextField extends StatelessWidget {
  final String? label;
  final String? hint;
  final IconData? icon;
  final TextEditingController controller;
  final bool obscure;
  final TextInputType? keyboardType;
  final int? maxLength;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final TextCapitalization capitalization;

  const AppTextField({
    super.key,
    this.label,
    this.hint,
    this.icon,
    required this.controller,
    this.obscure = false,
    this.keyboardType,
    this.maxLength,
    this.onChanged,
    this.onSubmitted,
    this.capitalization = TextCapitalization.none,
  });

  @override
  Widget build(BuildContext context) {
    final border = OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.white.withAlpha(26), width: 1.5));
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (label != null) Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(label!.toUpperCase(), style: AppText.label)),
        TextField(
          controller: controller,
          obscureText: obscure,
          keyboardType: keyboardType,
          maxLength: maxLength,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
          autocorrect: false,
          textCapitalization: capitalization,
          style: const TextStyle(color: Colors.white, fontSize: 16),
          decoration: InputDecoration(
            counterText: '',
            hintText: hint,
            hintStyle: const TextStyle(color: AppColors.textMuted),
            prefixIcon: icon == null ? null : Icon(icon, color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.input,
            border: border,
            enabledBorder: border,
            focusedBorder: border.copyWith(borderSide: const BorderSide(color: AppColors.gold, width: 1.5)),
          ),
        ),
      ]),
    );
  }
}

class Option<T> {
  final String label;
  final T value;
  final String? hint;
  final bool disabled;
  const Option(this.label, this.value, {this.hint, this.disabled = false});
}

/// A row of selectable chips (e.g. "2 / 3 / 4 players"). The chosen chip glows gold.
class OptionPicker<T> extends StatelessWidget {
  final String? label;
  final List<Option<T>> options;
  final T value;
  final ValueChanged<T> onChanged;
  const OptionPicker({super.key, this.label, required this.options, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (label != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(label!.toUpperCase(), style: AppText.label)),
        Row(children: [
          for (var i = 0; i < options.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            Expanded(child: _chip(options[i])),
          ],
        ]),
      ]),
    );
  }

  Widget _chip(Option<T> o) {
    final selected = o.value == value;
    return Opacity(
      opacity: o.disabled ? 0.35 : 1,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: o.disabled ? null : () => onChanged(o.value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: selected ? AppColors.gold.withAlpha(40) : Colors.white.withAlpha(18),
            border: Border.all(color: selected ? AppColors.gold : Colors.white.withAlpha(31), width: 1.5),
          ),
          child: Column(children: [
            Text(o.label,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: selected ? AppColors.gold : AppColors.textDim, fontWeight: FontWeight.w800, fontSize: 14)),
            if (o.hint != null)
              Text(o.hint!, textAlign: TextAlign.center, maxLines: 1, style: TextStyle(color: selected ? const Color(0xFFFFE3A1) : AppColors.textMuted, fontSize: 10)),
          ]),
        ),
      ),
    );
  }
}
