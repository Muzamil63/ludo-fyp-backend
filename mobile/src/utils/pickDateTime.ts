// Opens Android's date picker, then its time picker. Resolves with the chosen Date, or null if cancelled.
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

export function pickDateTime(initial: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'date',
      minimumDate: new Date(),
      onChange: (dateEvent, date) => {
        if (dateEvent.type !== 'set' || !date) return resolve(null);
        DateTimePickerAndroid.open({
          value: initial,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== 'set' || !time) return resolve(null);
            const result = new Date(date);
            result.setHours(time.getHours(), time.getMinutes(), 0, 0);
            resolve(result);
          },
        });
      },
    });
  });
}
